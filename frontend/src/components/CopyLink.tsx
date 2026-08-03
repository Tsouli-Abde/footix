import { useState } from 'react';
import { Button } from './ui';

/** Une URL complète avec un bouton « Copier ». */
export function CopyLink({ path, label, hint }: { path: string; label: string; hint?: string }) {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}${path}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Contexte non sécurisé ou permission refusée : l'URL reste sélectionnable à la main.
      setCopied(false);
    }
  };

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-slate-700">{label}</p>
      <div className="flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600" />
        <Button variant="secondary" onClick={copy} className="shrink-0">
          {copied ? 'Copié !' : 'Copier'}
        </Button>
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
