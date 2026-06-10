import { subscribeAgendaRealtime } from '@/lib/agenda/realtime/hub';
import { ensureAgendaRealtimePgListener } from '@/lib/agenda/realtime/pgBus';
import { requireAgendaStreamAccess } from '@/lib/agenda/realtime/streamAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HEARTBEAT_MS = 30_000;

export async function GET(
  request: Request,
  context: { params: Promise<{ dispensarySlug: string }> },
) {
  const { dispensarySlug } = await context.params;
  const access = await requireAgendaStreamAccess(request, dispensarySlug);
  if (!access.ok) {
    return new Response(access.error, { status: access.status });
  }

  await ensureAgendaRealtimePgListener();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (chunk: string) => {
        controller.enqueue(encoder.encode(chunk));
      };

      send(': connected\n\n');

      const unsubscribe = subscribeAgendaRealtime(access.dispensaryId, send);

      const heartbeat = setInterval(() => {
        try {
          send(': ping\n\n');
        } catch {
          clearInterval(heartbeat);
        }
      }, HEARTBEAT_MS);

      const close = () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Stream may already be closed.
        }
      };

      request.signal.addEventListener('abort', close, { once: true });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
