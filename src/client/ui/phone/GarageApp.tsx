import { CAR_MODELS } from '../../game/vehicle';
import { useTr } from '../../i18n';
import { useGame } from '../../state/game';
import { toast } from '../../state/ui';
import type { PhoneActions } from './Phone';

export function GarageApp({ actions }: { actions: PhoneActions }) {
  const t = useTr();
  const save = useGame((s) => s.save!);
  return (
    <div className="space-y-4 p-4">
      <section>
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-white/50">{t('내 차', 'My cars')}</h3>
        {save.cars.length === 0 && <p className="rounded-xl bg-white/5 p-4 text-sm text-white/50">{t('아직 차가 없어요. 초록 배지가 붙은 City Share 차를 이용하거나, 엘든 모터스에서 구매하세요.', 'No cars yet. Use green-badge City Share cars, or buy one at Elden Motors.')}</p>}
        <ul className="space-y-2">
          {save.cars.map((id) => {
            const m = CAR_MODELS[id];
            return (
              <li key={id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                <span className="h-8 w-8 rounded-lg" style={{ background: m.colors[0] }} />
                <div className="flex-1">
                  <div className="font-semibold text-white">{m.name}</div>
                  <div className="text-xs text-white/50">{Math.round(m.maxSpeed * 0.4)} km/h</div>
                </div>
                <button
                  className="btn-primary px-3 py-2 text-xs"
                  onClick={() => {
                    actions.deliverCar(id);
                    toast(t('차를 근처 도로에 가져다 놨어요 🚗', 'Your car is waiting on the nearest road 🚗'), 'good');
                  }}
                >
                  {t('호출', 'Deliver')}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      {actions.hasJob() && (
        <button className="btn-danger w-full" onClick={() => actions.endJob()}>
          {t('근무 종료', 'End shift')}
        </button>
      )}
      {Object.keys(save.coupons).length > 0 && (
        <p className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200">🎟️ {t('엘든 모터스 20% 할인 쿠폰 보유', 'You have a 20% Elden Motors coupon')}</p>
      )}
    </div>
  );
}
