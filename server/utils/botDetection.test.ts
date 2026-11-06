import { describe, expect, it } from 'vitest';
import { isBotUserAgent } from './botDetection.js';

describe('isBotUserAgent', () => {
  it('recognizes Bing renderer UA (the Applebot log case)', () => {
    expect(isBotUserAgent(
      'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm) Chrome/116.0.1938.76 Safari/537.36'
    )).toBe(true);
  });

  it('recognizes major crawlers', () => {
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Applebot/0.1; +http://www.apple.com/go/applebot)')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (compatible; Bytespider; spider-feedback@bytedance.com)')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (compatible; GPTBot/1.0; +https://openai.com/gptbot)')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)')).toBe(true);
    expect(isBotUserAgent('Mozilla/5.0 (compatible; CCBot/2.0; +https://commoncrawl.org/faq/)')).toBe(true);
  });

  it('recognizes CLI and headless tools', () => {
    expect(isBotUserAgent('curl/8.5.0')).toBe(true);
    expect(isBotUserAgent('Wget/1.21.4')).toBe(true);
    expect(isBotUserAgent('HeadlessChrome/126.0.0.0')).toBe(true);
  });

  it('does not flag normal browsers', () => {
    expect(isBotUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    )).toBe(false);
    expect(isBotUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'
    )).toBe(false);
    expect(isBotUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0'
    )).toBe(false);
  });

  it('treats empty UA as non-bot to avoid hurting privacy users', () => {
    expect(isBotUserAgent(undefined)).toBe(false);
    expect(isBotUserAgent('')).toBe(false);
  });
});
