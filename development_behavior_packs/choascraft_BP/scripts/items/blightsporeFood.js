export class RawBlightsporeFoodComponent {
  onCompleteUse({ source }) {
    if (!source) return;

    source.addEffect("night_vision", 20 * 20, { amplifier: 0 });
    if (Math.random() < 0.35) {
      source.addEffect("poison", 4 * 20, { amplifier: 0 });
    }
  }
}

export class MatureBlightsporeFoodComponent {
  onCompleteUse({ source }) {
    if (!source) return;

    source.addEffect("regeneration", 6 * 20, { amplifier: 0 });
    if (Math.random() < 0.65) {
      source.addEffect("nausea", 8 * 20, { amplifier: 0 });
    }
  }
}
