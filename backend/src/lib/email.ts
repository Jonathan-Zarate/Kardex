import nodemailer from 'nodemailer'

const smtpConfigured = !!(
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
)

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  if (!transporter) {
    console.log(`[EMAIL DEV] Password reset → ${to}\n  ${resetUrl}`)
    return
  }

  await transporter.sendMail({
    from: `"Kardex" <${process.env.SMTP_FROM ?? process.env.SMTP_USER}>`,
    to,
    subject: 'Recuperación de contraseña — Kardex',
    html: `
      <p>Recibimos una solicitud para restablecer tu contraseña.</p>
      <p><a href="${resetUrl}">Haz clic aquí para continuar</a></p>
      <p>Este enlace expira en 30 minutos y es de uso único.</p>
      <p>Si no solicitaste esto, ignora este correo.</p>
    `,
  })
}
