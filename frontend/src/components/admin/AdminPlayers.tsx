import { useState } from 'react';
import { AVAILABILITY_LABELS } from '../../lib/availability';
import { formatShortDate } from '../../lib/dates';
import { AVAILABILITY_VALUES, type AdminPlayer } from '../../types';
import { Button, Card, inputClass } from '../ui';

type Props = {
  players: AdminPlayer[];
  busy: string | null;
  onRename: (player: AdminPlayer, name: string) => void;
  onRemove: (player: AdminPlayer) => void;
};

/**
 * Les joueurs, reconstitués depuis les réponses : il n'y a pas de comptes, on
 * existe parce qu'on a répondu au moins une fois.
 *
 * Le renommage sert aux fautes de frappe — « Sarahh » trois semaines de suite
 * compte comme un joueur à part et fausse l'historique.
 */
export function AdminPlayers({ players, busy, onRename, onRemove }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  if (players.length === 0) {
    return <Card className="text-center text-sm text-slate-500">Personne n’a encore répondu à un sondage.</Card>;
  }

  const startEdit = (player: AdminPlayer) => {
    setEditing(player.nameKey);
    setDraft(player.name);
  };

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="pb-2 pr-3 font-medium">Joueur</th>
            {AVAILABILITY_VALUES.map((value) => (
              <th key={value} className="pb-2 pr-3 text-right font-medium">
                {AVAILABILITY_LABELS[value]}
              </th>
            ))}
            <th className="pb-2 pr-3 text-right font-medium">Réponses</th>
            <th className="pb-2 pr-3 text-right font-medium">Dernière</th>
            <th className="pb-2 font-medium" />
          </tr>
        </thead>
        <tbody>
          {players.map((player) => {
            const working = busy === player.nameKey;
            return (
              <tr key={player.nameKey} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-3">
                  {editing === player.nameKey ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        maxLength={60}
                        autoFocus
                        className={`${inputClass} w-40`}
                      />
                      <Button
                        disabled={working || draft.trim().length < 2}
                        onClick={() => {
                          onRename(player, draft.trim());
                          setEditing(null);
                        }}
                      >
                        Enregistrer
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing(null)}>
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <span className="font-medium text-slate-800">{player.name}</span>
                  )}
                </td>

                {AVAILABILITY_VALUES.map((value) => (
                  <td key={value} className="py-2 pr-3 text-right tabular-nums text-slate-600">
                    {player.counts[value]}
                  </td>
                ))}

                <td className="py-2 pr-3 text-right tabular-nums text-slate-800">{player.answers}</td>
                <td className="py-2 pr-3 text-right text-xs text-slate-500">
                  {formatShortDate(player.lastMatchDate)}
                </td>

                <td className="py-2">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" disabled={working} onClick={() => startEdit(player)}>
                      Renommer
                    </Button>
                    <Button variant="danger" disabled={working} onClick={() => onRemove(player)}>
                      Retirer
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
