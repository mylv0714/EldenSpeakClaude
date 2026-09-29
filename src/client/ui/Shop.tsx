import type { CarModelId } from '@shared/types';
import { Check } from 'lucide-react';
import { sfx } from '../audio/sfx';
import { OUTFITS } from '../game/outfits';
import { carSprite } from '../game/render/sprites';
import { CAR_MODELS, DEALER_STOCK } from '../game/vehicle';
import { useLang, useTr } from '../i18n';
import { buyCar, buyOutfit, useGame, wearOutfit } from '../state/game';
import { toast } from '../state/ui';
import { Avatar } from './Avatar';
import { CloseButton, Modal, money } from './common';

function CarPreview({ model }: { model: CarModelId }) {
  const m = CAR_MODELS[model];
  const src = carSprite(m, m.colors[0]).toDataURL();
  return <img src={src} alt="" className="h-10 w-auto -rotate-90 object-contain [image-rendering:auto]" style={{ width: 90 }} />;
}

export function Shop({ shop, onClose, onCarDelivered }: { shop: 'cars' | 'outfits'; onClose: () => void; onCarDelivered: (m: CarModelId) => void }) {
  const t = useTr();
  const lang = useLang();
  const save = useGame((s) => s.save!);
  const coupon = save.coupons.dealer20;

  return (
    <Modal onBackdrop={onClose} wide>
      <div className="flex items-center justify-between border-b border-white/10 p-5">
        <div>
          <h2 className="display text-2xl uppercase text-white">{shop === 'cars' ? 'Elden Motors' : 'Maison Mode'}</h2>
          <p className="text-sm text-white/60">
            {t('보유 금액', 'Cash')}: <b className="text-emerald-300">{money(save.cash)}</b>
            {shop === 'cars' && coupon && <span className="ml-2 chip bg-emerald-500/20 text-emerald-200">🎟️ {t('20% 할인 쿠폰 적용', '20% coupon applied')}</span>}
          </p>
        </div>
        <CloseButton onClick={onClose} />
      </div>
      <div className="scroll-thin grid gap-3 overflow-y-auto p-4 sm:grid-cols-2">
        {shop === 'cars'
          ? DEALER_STOCK.map((id) => {
              const m = CAR_MODELS[id];
              const price = Math.round(m.price * (coupon ? 1 - coupon : 1));
              const owned = save.cars.includes(id);
              return (
                <div key={id} className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
                  <CarPreview model={id} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white">{m.name}</div>
                    <div className="text-xs text-white/50">
                      {t('최고속도', 'Top speed')} {Math.round(m.maxSpeed * 0.4)} km/h
                    </div>
                    {!owned && (
                      <div className="text-sm font-bold text-emerald-300">
                        {coupon && <span className="mr-1 text-xs text-white/40 line-through">{money(m.price)}</span>}
                        {money(price)}
                      </div>
                    )}
                  </div>
                  {owned ? (
                    <button className="btn-ghost px-3 py-2 text-xs" onClick={() => onCarDelivered(id)}>
                      {t('가져오기', 'Deliver')}
                    </button>
                  ) : (
                    <button
                      className="btn-primary px-3 py-2 text-xs"
                      disabled={save.cash < price}
                      onClick={() => {
                        buyCar(id, price, coupon ? 'dealer20' : undefined);
                        sfx.play('cash');
                        toast(t(`${m.name} 구매 완료! 🚗`, `You bought the ${m.name}! 🚗`), 'cash');
                        onCarDelivered(id);
                      }}
                    >
                      {t('구매', 'Buy')}
                    </button>
                  )}
                </div>
              );
            })
          : OUTFITS.map((o) => {
              const owned = save.outfits.includes(o.id) || o.price === 0;
              const wearing = save.outfit === o.id;
              return (
                <div key={o.id} className={`flex items-center gap-3 rounded-xl p-3 ${wearing ? 'bg-yellow-400/10 ring-1 ring-yellow-400/40' : 'bg-white/5'}`}>
                  <Avatar look={{ ...save.look, shirt: o.shirt }} size={52} />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white">{o.name[lang]}</div>
                    <div className="mt-1 flex gap-1">
                      <span className="h-3 w-6 rounded" style={{ background: o.shirt }} />
                      <span className="h-3 w-6 rounded" style={{ background: o.pants }} />
                    </div>
                    {!owned && <div className="text-sm font-bold text-emerald-300">{money(o.price)}</div>}
                  </div>
                  {wearing ? (
                    <span className="chip bg-yellow-400/20 text-yellow-200">
                      <Check size={12} /> {t('착용 중', 'Wearing')}
                    </span>
                  ) : owned ? (
                    <button className="btn-ghost px-3 py-2 text-xs" onClick={() => wearOutfit(o.id)}>
                      {t('입기', 'Wear')}
                    </button>
                  ) : (
                    <button
                      className="btn-primary px-3 py-2 text-xs"
                      disabled={save.cash < o.price}
                      onClick={() => {
                        buyOutfit(o.id, o.price);
                        sfx.play('cash');
                        toast(t('새 옷으로 갈아입었어요! ✨', 'Looking sharp! ✨'), 'cash');
                      }}
                    >
                      {t('구매', 'Buy')}
                    </button>
                  )}
                </div>
              );
            })}
      </div>
    </Modal>
  );
}
