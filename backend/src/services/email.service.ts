import nodemailer from 'nodemailer';
import { prisma } from '../config/database';

export async function getEmailTransporter() {
  const configs = await prisma.configuracao.findMany({
    where: {
      chave: {
        in: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'],
      },
    },
  });

  const configMap = configs.reduce((acc, c) => {
    acc[c.chave] = c.valor;
    return acc;
  }, {} as Record<string, string>);

  if (!configMap['SMTP_HOST'] || !configMap['SMTP_USER'] || !configMap['SMTP_PASS']) {
    throw new Error('Configurações SMTP incompletas. Acesse as configurações e preencha os dados de e-mail.');
  }

  const transporter = nodemailer.createTransport({
    host: configMap['SMTP_HOST'],
    port: parseInt(configMap['SMTP_PORT'] || '587', 10),
    secure: parseInt(configMap['SMTP_PORT'] || '587', 10) === 465, // true para 465, false para outros
    auth: {
      user: configMap['SMTP_USER'],
      pass: configMap['SMTP_PASS'],
    },
  });

  return {
    transporter,
    from: configMap['SMTP_FROM'] || configMap['SMTP_USER'],
  };
}

export async function sendEmail({ to, subject, html, text }: { to: string, subject: string, html: string, text?: string }) {
  const { transporter, from } = await getEmailTransporter();
  
  const info = await transporter.sendMail({
    from: `"OPERIS" <${from}>`,
    to,
    subject,
    text: text || subject,
    html,
  });

  return info;
}
