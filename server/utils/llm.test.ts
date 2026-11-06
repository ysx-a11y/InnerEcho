import { describe, it, expect, afterEach, vi } from 'vitest';
import { callLlm } from './llm.js';
import { isLlmBaseUrlAllowed } from './security.js';

const validContent = JSON.stringify({
  archetypeTitle: '测试原型',
  personaDeconstruction: '测试人格',
  shadowDeconstruction: '测试阴影',
  psychologicalSublimation: '测试建议',
  resonanceKeywords: ['测试'],
});

function jsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('callLlm', () => {
  it('LLM 返回空 content 时自动重试一次并成功', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: '' } }] }))
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: validContent } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLlm({
      messages: [{ role: 'user', content: '测试' }],
    });

    expect(result.ok).toBe(true);
    expect(result.data?.archetypeTitle).toBe('测试原型');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstRequestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(firstRequestBody.response_format).toEqual({ type: 'json_object' });
  });

  it('连续两次空 content 时返回失败', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ choices: [{ message: { content: '' } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLlm({
      messages: [{ role: 'user', content: '测试' }],
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toBe('LLM returned empty content');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('首次调用中止（超时）时重试一次并成功', async () => {
    const abortError = new DOMException('This operation was aborted', 'AbortError');
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(abortError)
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: validContent } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLlm({
      messages: [{ role: 'user', content: '测试' }],
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('非白名单 baseUrl 直接拒绝（防 SSRF）', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLlm({
      baseUrl: 'https://evil.attacker.com/v1',
      messages: [{ role: 'user', content: '测试' }],
    });

    expect(result.ok).toBe(false);
    expect(result.errorMessage).toContain('not allowed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('非法 JSON 返回失败且不重试', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: 'not-json' } }] })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLlm({
      messages: [{ role: 'user', content: '测试' }],
    });

    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('结构化拒绝会用中性任务说明重试一次', async () => {
    const refusalContent = JSON.stringify({
      archetypeTitle: '无法提供分析',
      personaDeconstruction: '抱歉，我无法为你生成这类分析。',
      shadowDeconstruction: '作为 AI，我不能协助完成这项解读。',
      psychologicalSublimation: '',
      resonanceKeywords: [],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: refusalContent } }] }))
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: validContent } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLlm({ messages: [{ role: 'user', content: '测试 JSON' }] });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(retryBody.messages).toHaveLength(2);
    expect(retryBody.messages[1].content).toContain('任务仅是依据原文做主题归纳');
  });

  it('provider 不支持 response_format 时降级重试并成功', async () => {
    const unsupported = {
      ok: false,
      status: 400,
      text: async () => '{"error":{"message":"Unsupported parameter: response_format"}}',
    } as unknown as Response;
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unsupported)
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: validContent } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLlm({ messages: [{ role: 'user', content: '测试' }] });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    const secondBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(firstBody.response_format).toEqual({ type: 'json_object' });
    expect(secondBody.response_format).toBeUndefined();
  });

  it('与 response_format 无关的 400 错误不重试', async () => {
    const badRequest = {
      ok: false,
      status: 400,
      text: async () => 'rate limited',
    } as unknown as Response;
    const fetchMock = vi.fn().mockResolvedValue(badRequest);
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLlm({ messages: [{ role: 'user', content: '测试' }] });

    expect(result.ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('LLM 返回四维全 0 的默认值时自动重试一次并成功', async () => {
    const degenerateContent = JSON.stringify({
      archetypeTitle: '默认结果',
      personaDeconstruction: '',
      shadowDeconstruction: '',
      psychologicalSublimation: '',
      dominanceIndex: 0,
      submissionIndex: 0,
      restraintIndex: 0,
      sensoryThreshold: 0,
      resonanceKeywords: [],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: degenerateContent } }] }))
      .mockResolvedValueOnce(jsonResponse({ choices: [{ message: { content: validContent } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLlm({ messages: [{ role: 'user', content: '测试' }] });

    expect(result.ok).toBe(true);
    expect(result.data?.archetypeTitle).toBe('测试原型');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const retryBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body));
    expect(retryBody.messages).toHaveLength(2);
    expect(retryBody.messages[1].content).toContain('四维指标');
  });

  it('连续两次返回明显异常默认值时判定为 degenerate 失败', async () => {
    const degenerateContent = JSON.stringify({
      archetypeTitle: '默认结果',
      personaDeconstruction: '',
      shadowDeconstruction: '',
      psychologicalSublimation: '',
      resonanceKeywords: [],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ choices: [{ message: { content: degenerateContent } }] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await callLlm({ messages: [{ role: 'user', content: '测试' }] });

    expect(result.ok).toBe(false);
    expect(result.degenerate).toBe(true);
    expect(result.errorMessage).toContain('解读正文全部为空');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe('isLlmBaseUrlAllowed', () => {
  it('白名单 host 默认 https 端口允许', () => {
    expect(isLlmBaseUrlAllowed('https://api.deepseek.com/v1')).toBe(true);
    expect(isLlmBaseUrlAllowed('https://api.deepseek.com:443/v1')).toBe(true);
  });

  it('非 loopback 白名单 host 使用 http 拒绝', () => {
    expect(isLlmBaseUrlAllowed('http://api.deepseek.com/v1')).toBe(false);
  });

  it('非 loopback 白名单 host 使用非常规端口拒绝', () => {
    expect(isLlmBaseUrlAllowed('https://api.deepseek.com:8443/v1')).toBe(false);
  });

  it('非白名单 host 拒绝', () => {
    expect(isLlmBaseUrlAllowed('https://evil.attacker.com/v1')).toBe(false);
  });

  it('非法 URL 拒绝', () => {
    expect(isLlmBaseUrlAllowed('not-a-url')).toBe(false);
  });
});
