'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { supabase } from '../../supabaseClient';

interface Ticket {
  id: number;
  title: string;
  description: string;
  tech_wizard?: string[] | string | null;
  status: string;
  priority?: string;
  is_archived?: boolean;
}

interface WizardMetric {
  name: string;
  inProgress: Ticket[];
  inTest: Ticket[];
  done: Ticket[];
  archived: Ticket[];
  total: number;
}

type ReportCategory = 'inProgress' | 'inTest' | 'done' | 'archived';

const wizardNameAliases: Record<string, string> = {
  'dan faulk': 'daniel faulk',
};

function normalizeWizardNames(value: Ticket['tech_wizard']) {
  if (!value) return ['Unassigned'];

  const rawNames = Array.isArray(value) ? value : [value];

  const names = rawNames
    .flatMap((name) => String(name).split(/[,;/|]+/))
    .map((name) => name.trim())
    .filter(Boolean);

  return names.length > 0 ? Array.from(new Set(names)) : ['Unassigned'];
}

function getWizardKey(name: string) {
  const normalizedName = name.trim().toLowerCase().replace(/\s+/g, ' ');
  return wizardNameAliases[normalizedName] || normalizedName;
}

function formatWizardName(name: string) {
  return getWizardKey(name)
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getTicketCategory(ticket: Ticket): ReportCategory | null {
  if (ticket.is_archived) return 'archived';

  switch (ticket.status?.toLowerCase()) {
    case 'in progress':
      return 'inProgress';
    case 'in test':
      return 'inTest';
    case 'done':
      return 'done';
    default:
      return null;
  }
}

function getCategoryLabel(category: ReportCategory | null) {
  switch (category) {
    case 'inProgress':
      return 'In Progress';
    case 'inTest':
      return 'In Test';
    case 'archived':
      return 'Archived';
    case 'done':
      return 'Done';
    default:
      return 'Tracked';
  }
}

function getCategoryBadgeStyle(category: ReportCategory | null) {
  switch (category) {
    case 'inProgress':
      return 'text-cyan-300 bg-cyan-950/40 border-cyan-900/60';
    case 'inTest':
      return 'text-fuchsia-300 bg-fuchsia-950/40 border-fuchsia-900/60';
    case 'archived':
      return 'text-blue-300 bg-blue-950/40 border-blue-900/60';
    default:
      return 'text-purple-300 bg-purple-950/40 border-purple-900/60';
  }
}

function isReportableTicket(ticket: Ticket) {
  return Boolean(getTicketCategory(ticket));
}

export default function SparkleStatsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  useEffect(() => {
    async function fetchTickets() {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error('Error fetching reporting data:', error);
      } else if (data) {
        setTickets(data);
      }

      setIsLoading(false);
    }

    void fetchTickets();

    const realtimeDatabaseChannel = supabase
      .channel('sparkle-stats-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        () => {
          void fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtimeDatabaseChannel);
    };
  }, []);

  const reportableTickets = useMemo(
    () => tickets.filter(isReportableTicket),
    [tickets]
  );

  const wizardMetrics = useMemo<WizardMetric[]>(() => {
    const metrics = new Map<string, WizardMetric>();

    reportableTickets.forEach((ticket) => {
      normalizeWizardNames(ticket.tech_wizard).forEach((name) => {
        const wizardKey = getWizardKey(name);
        const current = metrics.get(wizardKey) || {
          name: formatWizardName(name),
          inProgress: [],
          inTest: [],
          done: [],
          archived: [],
          total: 0,
        };
        const category = getTicketCategory(ticket);

        if (category) current[category].push(ticket);
        current.total += 1;
        metrics.set(wizardKey, current);
      });
    });

    return Array.from(metrics.values()).sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.name.localeCompare(b.name);
    });
  }, [reportableTickets]);

  const inProgressTickets = reportableTickets.filter((ticket) => getTicketCategory(ticket) === 'inProgress');
  const inTestTickets = reportableTickets.filter((ticket) => getTicketCategory(ticket) === 'inTest');
  const doneTickets = reportableTickets.filter((ticket) => getTicketCategory(ticket) === 'done');
  const archivedTickets = reportableTickets.filter((ticket) => ticket.is_archived);
  const topWizard = wizardMetrics[0];

  if (!hasMounted) {
    return <div className="min-h-screen w-screen bg-gray-950" />;
  }

  return (
    <main className="min-h-screen w-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
      <header className="w-full bg-[#090b11] border-b border-gray-800 h-16 shrink-0 shadow-lg shadow-purple-950/10 flex items-center justify-between gap-3 px-4 sm:px-8">
        <div>
          <h1 className="text-lg sm:text-xl text-purple-300 font-black tracking-wide [font-family:var(--font-elsie)]">
            Sparkle Stats
          </h1>
          <p className="text-[11px] text-gray-500 hidden sm:block">
            Reporting For In Progress, In Test, Done, And Archived Wizard Work.
          </p>
        </div>
        <Link
          href="/board"
          className="px-4 py-1.5 rounded-xl border text-xs font-bold font-sans transition shadow-md flex items-center gap-1.5 bg-gray-900 border-gray-800 text-purple-400 hover:text-white hover:border-gray-700"
        >
          📋 Back to Board
        </Link>
      </header>

      <section
        style={{ backgroundImage: 'url("/emivation-background.png")' }}
        className="h-[calc(100vh-4rem)] min-h-0 p-4 md:p-6 xl:p-8 bg-gray-950 bg-cover bg-center overflow-auto relative"
      >
        <div className="absolute inset-0 bg-gray-950/45 pointer-events-none" />

        <div className="relative z-10 flex min-w-[960px] gap-6 h-full max-h-[86vh] items-stretch py-2 pr-4">
          <div className="w-80 shrink-0 bg-gray-900/70 rounded-xl flex flex-col border border-gray-800/80 h-full backdrop-blur-sm shadow-xl shadow-black/40 overflow-hidden">
            <div className="p-4 border-b border-gray-800 bg-gray-900/90 rounded-t-xl shrink-0">
              <span className="text-base text-purple-300 font-black tracking-wide [font-family:var(--font-elsie)]">
                Magic Overview
              </span>
              <p className="text-xs text-gray-500 mt-1">In Progress, In Test, Done, And Archived Tickets</p>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Tickets Counted</p>
                <p className="text-3xl font-black text-white mt-1">{reportableTickets.length}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                  <p className="text-[11px] text-gray-400 font-bold">In Progress</p>
                  <p className="text-2xl font-black text-cyan-300">{inProgressTickets.length}</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                  <p className="text-[11px] text-gray-400 font-bold">In Test</p>
                  <p className="text-2xl font-black text-fuchsia-300">{inTestTickets.length}</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                  <p className="text-[11px] text-gray-400 font-bold">Done</p>
                  <p className="text-2xl font-black text-purple-300">{doneTickets.length}</p>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                  <p className="text-[11px] text-gray-400 font-bold">Archived</p>
                  <p className="text-2xl font-black text-blue-300">{archivedTickets.length}</p>
                </div>
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Top Tech Wizard</p>
                <p className="text-base font-black text-white mt-1 truncate">{topWizard?.name || 'No data yet'}</p>
                <p className="text-xs text-purple-300 mt-1">
                  {topWizard ? `${topWizard.total} ticket${topWizard.total === 1 ? '' : 's'} counted` : 'Move tickets into In Progress, In Test, Done, or Archive to begin.'}
                </p>
              </div>
            </div>
          </div>

          <div className="w-[28rem] shrink-0 bg-gray-900/70 rounded-xl flex flex-col border border-gray-800/80 h-full backdrop-blur-sm shadow-xl shadow-black/40 overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/90 rounded-t-xl shrink-0">
              <span className="text-base text-purple-300 font-black tracking-wide [font-family:var(--font-elsie)]">
                Tech Wizard Totals
              </span>
              <span className="bg-gray-800 text-xs px-2.5 py-0.5 rounded-full text-gray-400 font-sans font-bold">
                {wizardMetrics.length}
              </span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {isLoading && (
                <p className="text-sm text-gray-500 italic text-center py-12">Loading sparkle stats...</p>
              )}

              {!isLoading && wizardMetrics.length === 0 && (
                <p className="text-sm text-gray-500 italic text-center py-12">No In Progress, In Test, Done, or archived tickets found yet.</p>
              )}

              {wizardMetrics.map((wizard) => (
                <div key={wizard.name} className="bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-sm text-white truncate">
                      🧙 {wizard.name}
                    </h2>
                    <span className="bg-purple-950/60 border border-purple-700/50 text-purple-200 text-xs px-2.5 py-0.5 rounded-full font-bold shrink-0">
                      {wizard.total}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="rounded-md bg-gray-950/50 border border-gray-700 px-2.5 py-2">
                      <span className="text-gray-500 font-bold tracking-wide">In Progress</span>
                      <span className="block text-cyan-300 text-lg font-black">{wizard.inProgress.length}</span>
                    </div>
                    <div className="rounded-md bg-gray-950/50 border border-gray-700 px-2.5 py-2">
                      <span className="text-gray-500 font-bold tracking-wide">In Test</span>
                      <span className="block text-fuchsia-300 text-lg font-black">{wizard.inTest.length}</span>
                    </div>
                    <div className="rounded-md bg-gray-950/50 border border-gray-700 px-2.5 py-2">
                      <span className="text-gray-500 font-bold tracking-wide">Done</span>
                      <span className="block text-purple-300 text-lg font-black">{wizard.done.length}</span>
                    </div>
                    <div className="rounded-md bg-gray-950/50 border border-gray-700 px-2.5 py-2">
                      <span className="text-gray-500 font-bold tracking-wide">Archived</span>
                      <span className="block text-blue-300 text-lg font-black">{wizard.archived.length}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-[34rem] shrink-0 bg-gray-900/70 rounded-xl flex flex-col border border-gray-800/80 h-full backdrop-blur-sm shadow-xl shadow-black/40 overflow-hidden">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/90 rounded-t-xl shrink-0">
              <span className="text-base text-purple-300 font-black tracking-wide [font-family:var(--font-elsie)]">
                Counted Tickets
              </span>
              <span className="bg-gray-800 text-xs px-2.5 py-0.5 rounded-full text-gray-400 font-sans font-bold">
                {reportableTickets.length}
              </span>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-3">
              {reportableTickets.map((ticket) => {
                const category = getTicketCategory(ticket);

                return (
                  <div key={ticket.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-md min-h-[118px]">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-sm text-white truncate">
                      <span className="text-purple-400 font-bold font-mono mr-1">#{ticket.id}</span>
                      {ticket.title}
                    </h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-sans font-bold shrink-0 ${getCategoryBadgeStyle(category)}`}>
                      {getCategoryLabel(category)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {normalizeWizardNames(ticket.tech_wizard).map((name) => (
                      <span key={getWizardKey(name)} className="text-[10px] text-purple-300 bg-slate-950/80 border border-purple-500/20 rounded px-2 py-0.5 font-bold">
                        🧙 {formatWizardName(name)}
                      </span>
                    ))}
                  </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
