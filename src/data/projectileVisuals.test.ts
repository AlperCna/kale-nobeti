import { describe, expect, it } from 'vitest';
import { projectileLook } from './projectileVisuals';

describe('projectileVisuals — oyuncu geri bildirimi: mermiler aileye göre ayrışsın', () => {
  it('üç ailenin mermisi renkte ve ölçekte birbirinden farklı', () => {
    const okcu = projectileLook('okcu');
    const top = projectileLook('top');
    const buyu = projectileLook('buyu');
    expect(new Set([okcu.color, top.color, buyu.color]).size).toBe(3);
    expect(okcu.scaleX).not.toBe(top.scaleX);
    expect(top.scaleX).not.toBe(buyu.scaleX);
  });

  it('ok hedefe dönük, gülle ve büyü dönmüyor', () => {
    expect(projectileLook('okcu').rotateToTarget).toBe(true);
    expect(projectileLook('top').rotateToTarget).toBe(false);
    expect(projectileLook('buyu').rotateToTarget).toBe(false);
  });

  it('dal etkisi yalnız rengi eziyor, ailenin ölçeği/yönü kalıyor', () => {
    const taban = projectileLook('okcu');
    const yanan = projectileLook('okcu', 'burn');
    expect(yanan.color).not.toBe(taban.color);
    expect(yanan.scaleX).toBe(taban.scaleX);
    expect(yanan.rotateToTarget).toBe(taban.rotateToTarget);
    // Üç etki üç ayrı renk — buz ile yıldırım karışmasın.
    expect(new Set([yanan.color, projectileLook('buyu', 'slow').color, projectileLook('buyu', 'chain').color]).size).toBe(3);
  });
});
