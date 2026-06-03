import { config } from '../config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tencentcloud = require('tencentcloud-sdk-nodejs');
const AsrClient = tencentcloud.asr.v20190614.Client;

export async function recognizeAudio(audioBase64: string, dataLen: number): Promise<string> {
  if (!config.tencent.secretId) {
    console.log('[ASR] DEV mock mode - no SecretId configured');
    return '[语音识别结果] 开发环境 mock';
  }

  console.log(`[ASR] Calling Tencent Cloud ASR, dataLen=${dataLen}, base64Len=${audioBase64.length}`);

  try {
    const client = new AsrClient({
      credential: {
        secretId: config.tencent.secretId,
        secretKey: config.tencent.secretKey,
      },
      region: 'ap-guangzhou',
    });

    const result = await client.SentenceRecognition({
      ProjectId: 0,
      SubServiceType: 2,
      EngSerViceType: '16k_zh',
      SourceType: 1,
      VoiceFormat: 'm4a',
      Data: audioBase64,
      DataLen: dataLen,
    });

    console.log('[ASR] Tencent Cloud response:', JSON.stringify(result));

    if (result.Result) {
      console.log(`[ASR] Recognized text (${result.Result.length} chars):`, result.Result);
      return result.Result;
    }

    console.log('[ASR] No Result in response. Full result keys:', Object.keys(result));
    return '';
  } catch (err: any) {
    console.error('[ASR] Tencent Cloud API error:', err.message);
    if (err.code) console.error('[ASR] Error code:', err.code);
    if (err.requestId) console.error('[ASR] Request ID:', err.requestId);
    throw err;
  }
}
