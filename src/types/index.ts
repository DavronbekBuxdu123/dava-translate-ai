export type Language = 'uz' | 'ru';
export type Tone = 'casual' | 'formal';
export type Translation = { id: string; sourceText: string; translatedText: string; sourceLang: Language; targetLang: Language; tone: Tone; createdAt: string; favorites?: { id: string }[] };
export type Message = Pick<Translation, 'id' | 'sourceText' | 'translatedText' | 'sourceLang' | 'targetLang' | 'createdAt'>;
export type Conversation = { id: string; title: string; createdAt: string; endedAt: string | null; messages?: Message[] };
export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: { code: string; message: string } };
export const languages: Record<Language, string> = { uz: "O‘zbekcha", ru: 'Русский' };
export const opposite = (language: Language): Language => language === 'uz' ? 'ru' : 'uz';
export function swapTranslation(sourceText: string, translatedText: string, sourceLang: Language) { return { sourceText: translatedText, translatedText: sourceText, sourceLang: opposite(sourceLang) }; }
