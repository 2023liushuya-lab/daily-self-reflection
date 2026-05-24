import * as tencentcloud from 'tencentcloud-sdk-nodejs';
import { config } from '../config';

const SmsClient = tencentcloud.sms.v20210111.Client;

interface SendResult {
  success: boolean;
  code?: string;
}

const isDev = !config.tencent.secretId;

export async function sendVerificationCode(phone: string): Promise<SendResult> {
  const code = String(Math.floor(100000 + Math.random() * 900000));

  if (isDev) {
    console.log(`[DEV] 验证码发送到 ${phone}: ${code}`);
    return { success: true, code };
  }

  const client = new SmsClient({
    credential: {
      secretId: config.tencent.secretId,
      secretKey: config.tencent.secretKey,
    },
    region: 'ap-guangzhou',
  });

  await client.SendSms({
    SmsSdkAppId: config.tencent.smsAppId,
    SignName: config.tencent.smsSignName,
    TemplateId: config.tencent.smsTemplateId,
    TemplateParamSet: [code, '5'],
    PhoneNumberSet: [`+86${phone}`],
  });

  return { success: true, code };
}

const codeStore = new Map<string, { code: string; expiresAt: number }>();

export function storeCode(phone: string, code: string): void {
  codeStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
}

export function verifyCode(phone: string, code: string): boolean {
  const stored = codeStore.get(phone);
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    codeStore.delete(phone);
    return false;
  }
  if (stored.code !== code) return false;
  codeStore.delete(phone);
  return true;
}
