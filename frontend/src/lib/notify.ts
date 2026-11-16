import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const native = Capacitor.isNativePlatform();

/** Asks once; on the web the browser only shows the prompt after a user action. */
export async function askNotifications() {
  try {
    if (native) await LocalNotifications.requestPermissions();
    else if ('Notification' in window && Notification.permission === 'default') await Notification.requestPermission();
  } catch {
    /* no notifications on this device */
  }
}

export async function notify(title: string, body: string) {
  try {
    if (native) {
      await LocalNotifications.schedule({ notifications: [{ id: Date.now() % 2_000_000_000, title, body }] });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  } catch {
    /* no notifications on this device */
  }
}

// ponytail: fixed peak hours (lunch, after work); derive from the user's own transaction times if they ever carry hours.
const REMINDERS = [
  { id: 9001, hour: 12, minute: 30, body: 'Hora do almoço: gastou com comida ou compras? Lança agora em 10 segundos.' },
  { id: 9002, hour: 19, minute: 30, body: 'Fim do dia: registre os gastos de hoje antes de esquecer.' },
];

/** Two daily reminders at the hours people spend the most. The APK delivers them even with the app closed. */
export async function scheduleDailyReminders() {
  if (!native) return; // a closed browser tab can't wake up on a schedule
  try {
    if ((await LocalNotifications.requestPermissions()).display !== 'granted') return;
    await LocalNotifications.cancel({ notifications: REMINDERS.map(({ id }) => ({ id })) });
    await LocalNotifications.schedule({
      notifications: REMINDERS.map(({ id, hour, minute, body }) => ({
        id,
        title: 'finance+',
        body,
        schedule: { on: { hour, minute }, allowWhileIdle: true },
      })),
    });
  } catch {
    /* no notifications on this device */
  }
}
