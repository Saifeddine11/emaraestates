3            : 'unknown';
        error_log('Turnstile verification failed: ' . $codes);
        return false;
    }
    return true;
}

function contactWebhookUrl(array $env): string
{
    return trim($env['CONTACT_WEBHOOK_URL'] ?? '') ?: CONTACT_WEBHOOK_URL_FALLBACK;
}

function sendLeadToZapier(array $payload, array $env, string $ip): void
{
    $webhookUrl = contactWebhookUrl($env);
    if ($webhookUrl === '') {
        throw new RuntimeException('Zapier webhook URL missing.');
    }

    $zapierPayload = [
        'nom_complet' => $payload['nom_complet'],
        'email' => $payload['email'],
        'telephone' => $payload['telephone'],
        'phoneFull' => $payload['phoneFull'],
        'phoneCode' => $payload['phoneCode'],
        'phoneCountry' => $payload['phoneCountry'],
        'phoneCountryCode' => $payload['phoneCountryCode'],
        'phoneNumber' => $payload['phoneNumber'],
        'budget' => $payload['budget'],
        'message' => $payload['message'],
        'jour_visite' => $payload['jour_visite'],
        'company_website' => $payload['company_website'],
        'form_token' => $payload['form_token'],
        'elapsed_ms' => $payload['elapsed_ms'],
        'source' => $payload['source'] !== '' ? $payload['source'] : 'emaraestates.com',
        'form_id' => 'contactForm',
        'submitted_at' => date(DATE_ATOM),
        'ip' => $ip,
        'user_agent' => sanitizeValue($_SERVER['HTTP_USER_AGENT'] ?? '', 300),
        'page_url' => sanitizeValue($_SERVER['HTTP_REFERER'] ?? '', 500),
    ];

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => "Content-Type: application/json\r\nAccept: application/json\r\n",
            'content' => json_encode($zapierPayload, JSON_UNESCAPED_UNICODE),
            'ignore_errors' => true,
            'timeout' => 10,
        ],
    ]);
    $response = file_get_contents($webhookUrl, false, $context);
    $statusLine = $http_response_header[0] ?? '';

    if ($response === false || !preg_match('/\s2\d\d\s/', $statusLine)) {
        throw new RuntimeException('Zapier webhook failed: ' . ($statusLine ?: 'no response'));
    }
}

function smtpRead($socket): string
{
    $data = '';
    while (($line = fgets($socket, 515)) !== false) {
        $data .= $line;
        if (strlen($line) >= 4 && $line[3] === ' ') break;
    }
    return $data;
}

function smtpCommand($socket, string $command, array $expectedCodes): string
{
    fwrite($socket, $command . "\r\n");
    $response = smtpRead($socket);
    $code = (int) substr($response, 0, 3);
    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException('SMTP command failed: ' . $code);
    }
    return $response;
}

function encodeHeader(string $value): string
{
    return mb_encode_mimeheader($value, 'UTF-8', 'B', "\r\n");
}

function sendLeadEmail(array $payload, array $env): void
{
    try {
        sendLeadEmailWithPhpMail($payload, $env);
        return;
    } catch (Throwable $error) {
        error_log('PHP mail fallback to SMTP: ' . $error->getMessage());
    }

    sendLeadEmailWithSmtp($payload, $env);
}

function leadEmailBody(array $payload): string
{
    return implode("\r\n", [
        'Nouvelle demande depuis emaraestates.com',
        '',
        'Nom complet: ' . $payload['nom_complet'],
        'Email: ' . $payload['email'],
        'Téléphone: ' . $payload['telephone'],
        'phoneFull: ' . $payload['phoneFull'],
        'phoneCode: ' . $payload['phoneCode'],
        'phoneCountry: ' . $payload['phoneCountry'],
        'phoneCountryCode: ' . $payload['phoneCountryCode'],
        'phoneNumber: ' . $payload['phoneNumber'],
        'Budget: ' . $payload['budget'],
        'Jour de visite: ' . ($payload['jour_visite'] ?? ''),
        'Source: ' . (($payload['source'] ?? '') !== '' ? $payload['source'] : 'emaraestates.com'),
        '',
        'Message:',
        $payload['message'],
    ]);
}

function sendLeadEmailWithPhpMail(array $payload, array $env): void
{
    $to = $env['CONTACT_TO'] ?? 'contact@emaraestates.com';
    $from = $env['CONTACT_FROM'] ?? 'contact@emaraestates.com';
    $subject = 'Nouvelle demande Emara Estates';
    $headers = [
        'From: Emara Estates <' . $from . '>',
        'Reply-To: ' . encodeHeader($payload['nom_complet']) . ' <' . $payload['email'] . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
    ];

    $sent = mail($to, encodeHeader($subject), leadEmailBody($payload), implode("\r\n", $headers));
    if (!$sent) {
        throw new RuntimeException('mail() returned false.');
    }
}

function sendLeadEmailWithSmtp(array $payload, array $env): void
{
    $host = $env['SMTP_HOST'] ?? 'smtp.gmail.com';
    $port = (int) ($env['SMTP_PORT'] ?? 465);
    $user = $env['SMTP_USER'] ?? '';
    $pass = $env['SMTP_PASS'] ?? '';
    $to = $env['CONTACT_TO'] ?? 'contact@emaraestates.com';
    $from = $env['CONTACT_FROM'] ?? $user;

    if ($host === '' || $port <= 0 || $user === '' || $pass === '' || $from === '') {
        throw new RuntimeException('SMTP configuration missing.');
    }

    $subject = 'Nouvelle demande Emara Estates';
    $body = leadEmailBody($payload);
    $headers = [
        'From: Emara Estates <' . $from . '>',
        'To: ' . $to,
        'Reply-To: ' . encodeHeader($payload['nom_complet']) . ' <' . $payload['email'] . '>',
        'Subject: ' . encodeHeader($subject),
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'Date: ' . date(DATE_RFC2822),
    ];
    $message = implode("\r\n", $headers) . "\r\n\r\n" . $body . "\r\n";

    $socket = stream_socket_client('ssl://' . $host . ':' . $port, $errno, $errstr, 15, STREAM_CLIENT_CONNECT);
    if (!$socket) {
        throw new RuntimeException('SMTP connection failed: ' . $errstr);
    }
    stream_set_timeout($socket, 15);

    try {
        $greeting = smtpRead($socket);
        if ((int) substr($greeting, 0, 3) !== 220) throw new RuntimeException('SMTP greeting failed.');
        smtpCommand($socket, 'EHLO emaraestates.com', [250]);
        smtpCommand($socket, 'AUTH LOGIN', [334]);
        smtpCommand($socket, base64_encode($user), [334]);
        smtpCommand($socket, base64_encode($pass), [235]);
        smtpCommand($socket, 'MAIL FROM:<' . $from . '>', [250]);
        smtpCommand($socket, 'RCPT TO:<' . $to . '>', [250, 251]);
        smtpCommand($socket, 'DATA', [354]);
        fwrite($socket, str_replace("\r\n.", "\r\n..", $message) . "\r\n.\r\n");
        $dataResponse = smtpRead($socket);
        if (!in_array((int) substr($dataResponse, 0, 3), [250], true)) {
            throw new RuntimeException('SMTP data failed.');
        }
        smtpCommand($socket, 'QUIT', [221]);
    } finally {
        fclose($socket);
    }
}
