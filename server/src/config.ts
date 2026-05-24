export const config = {
  port: parseInt(process.env.PORT || '3000'),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  },
  tencent: {
    secretId: process.env.TENCENT_SECRET_ID || '',
    secretKey: process.env.TENCENT_SECRET_KEY || '',
    smsAppId: process.env.TENCENT_SMS_APP_ID || '',
    smsSignName: process.env.TENCENT_SMS_SIGN_NAME || '',
    smsTemplateId: process.env.TENCENT_SMS_TEMPLATE_ID || '',
  },
};
