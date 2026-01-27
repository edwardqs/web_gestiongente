<?php
// send_papeleta.php
// Sube este archivo a tu hosting (cPanel) en la carpeta public_html/api/
// Asegúrate de crear la carpeta 'api' si no existe.

header("Access-Control-Allow-Origin: *"); // Permitir peticiones desde cualquier origen (o restringe a tu dominio)
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// 1. Recibir datos
$emailDestino = $_POST['email'] ?? '';
$nombreTrabajador = $_POST['nombre'] ?? 'Trabajador';

if (empty($emailDestino) || !filter_var($emailDestino, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Correo inválido o faltante']);
    exit;
}

if (!isset($_FILES['pdf']) || $_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No se recibió el archivo PDF']);
    exit;
}

// 2. Configuración del Correo (MODIFICAR ESTO CON TUS DATOS DE CPANEL)
$smtpHost = 'mail.pauserdistribuciones.com'; // Generalmente es mail.midominio.com
$smtpUser = 'nor_generate@pauserdistribuciones.com'; // Crea este correo en cPanel
$smtpPass = '*Pauser2026'; // La contraseña de ese correo
$smtpPort = 465; // Puerto SSL

// Asunto y Mensaje
$subject = "Papeleta de Vacaciones/Licencia - $nombreTrabajador";
$message = "Hola $nombreTrabajador,\n\nAdjuntamos tu papeleta de vacaciones/licencia generada recientemente.\n\nAtentamente,\nRecursos Humanos - Pauser Distribuciones";

// 3. Construcción del Email con Adjunto (Multipart)
$boundary = md5(time());
$headers = "From: RRHH Pauser <$smtpUser>\r\n";
$headers .= "Reply-To: $smtpUser\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";

// Cuerpo del mensaje
$body = "--$boundary\r\n";
$body .= "Content-Type: text/plain; charset=UTF-8\r\n";
$body .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
$body .= "$message\r\n";

// Adjunto PDF
$pdfContent = file_get_contents($_FILES['pdf']['tmp_name']);
$pdfBase64 = chunk_split(base64_encode($pdfContent));
$filename = "Papeleta_$nombreTrabajador.pdf";

$body .= "--$boundary\r\n";
$body .= "Content-Type: application/pdf; name=\"$filename\"\r\n";
$body .= "Content-Transfer-Encoding: base64\r\n";
$body .= "Content-Disposition: attachment; filename=\"$filename\"\r\n\r\n";
$body .= "$pdfBase64\r\n";
$body .= "--$boundary--";

// 4. Envío usando mail() de PHP (La forma más simple en cPanel)
// Nota: Si mail() falla, se requeriría PHPMailer, pero en cPanel mail() suele estar preconfigurado.
// Para forzar el "From" correcto, usamos el parámetro adicional '-f'.

$envio = mail($emailDestino, $subject, $body, $headers, "-f$smtpUser");

if ($envio) {
    echo json_encode(['success' => true, 'message' => 'Correo enviado correctamente']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al enviar el correo. Verifica los logs del servidor.']);
}
?>
