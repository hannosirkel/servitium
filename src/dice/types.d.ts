declare module '@3d-dice/dice-box' {
  type DiceResult = { value: number };
  type DiceConfig = {
    assetPath: string;
    theme?: string;
    themeColor?: string;
    scale?: number;
    gravity?: number;
    mass?: number;
    friction?: number;
    restitution?: number;
    spinForce?: number;
    throwForce?: number;
  };
  export default class DiceBox {
    constructor(selector: string, config: DiceConfig);
    init(): Promise<void>;
    roll(notation: string): Promise<DiceResult[]>;
    clear(): void;
  }
}
