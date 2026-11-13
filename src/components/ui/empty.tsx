import { Sparkles } from 'lucide-react';
export function Empty({ title, text }: { title: string; text: string }) { return <div className="empty"><span className="empty-icon"><Sparkles size={25}/></span><h3>{title}</h3><p>{text}</p></div>; }
export function ErrorBox({ message }: { message: string }) { return <div className="error-box" role="alert">{message}</div>; }
