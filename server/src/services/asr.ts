import * as tencentcloud from 'tencentcloud-sdk-nodejs';
import { config } from '../config';

const AsrClient = tencentcloud.asr.v20190614.Client;

export async function recognizeAudio(audioBase64: string): Promise<string> {
  if (!config.tencent.secretId) {
    console.log('[DEV] ASR mock - audio length:', audioBase64.length);
    return '[语音识别结果] 开发环境 mock';
  }

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
    VoiceFormat: 'wav',
    Data: audioBase64,
    DataLen: audioBase64.length,
  });

  return result.Result || '';
}
