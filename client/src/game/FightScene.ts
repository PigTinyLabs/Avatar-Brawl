import Phaser from 'phaser';

// ── MAP LAYOUT ────────────────────────────────────────────────────────────
const MAP_W = 2400;
const MAP_H = 1800;
const MOVE_SPEED = 5; // Direct velocity scale

const MAP_OBJECTS: { x: number; y: number; w: number; h: number; type: string }[] = [
  // ─── Top area ───
  { x: 120, y: 80,   w: 160, h: 40,  type: 'wall' },
  { x: 400, y: 60,   w: 60,  h: 60,  type: 'rock' },
  { x: 650, y: 100,  w: 120, h: 80,  type: 'wall' },
  { x: 900, y: 50,   w: 60,  h: 60,  type: 'rock' },
  { x: 1100, y: 80,  w: 180, h: 40,  type: 'wall' },
  { x: 1400, y: 60,  w: 60,  h: 60,  type: 'rock' },
  { x: 1700, y: 90,  w: 120, h: 60,  type: 'wall' },
  { x: 2000, y: 50,  w: 80,  h: 80,  type: 'rock' },
  { x: 2200, y: 80,  w: 160, h: 40,  type: 'wall' },

  // ─── Left corridor ───
  { x: 80,  y: 300,  w: 40,  h: 200, type: 'wall' },
  { x: 80,  y: 650,  w: 40,  h: 200, type: 'wall' },
  { x: 80,  y: 1050, w: 40,  h: 200, type: 'wall' },
  { x: 80,  y: 1400, w: 40,  h: 200, type: 'wall' },

  // ─── Right corridor ───
  { x: 2280, y: 300,  w: 40, h: 200, type: 'wall' },
  { x: 2280, y: 650,  w: 40, h: 200, type: 'wall' },
  { x: 2280, y: 1050, w: 40, h: 200, type: 'wall' },
  { x: 2280, y: 1400, w: 40, h: 200, type: 'wall' },

  // ─── Center cluster ───
  { x: 1000, y: 750,  w: 80,  h: 80,  type: 'rock' },
  { x: 1150, y: 800,  w: 40,  h: 40,  type: 'rock' },
  { x: 1300, y: 750,  w: 80,  h: 80,  type: 'rock' },

  // ─── Middle-left house ───
  { x: 300,  y: 550,  w: 120, h: 100, type: 'wall' },
  { x: 300,  y: 900,  w: 120, h: 100, type: 'wall' },
  { x: 300,  y: 1250, w: 120, h: 100, type: 'wall' },

  // ─── Middle-right house ───
  { x: 1950, y: 550,  w: 120, h: 100, type: 'wall' },
  { x: 1950, y: 900,  w: 120, h: 100, type: 'wall' },
  { x: 1950, y: 1250, w: 120, h: 100, type: 'wall' },

  // ─── Horizontal walls mid-field ───
  { x: 600,  y: 440,  w: 200, h: 30,  type: 'wall' },
  { x: 900,  y: 440,  w: 200, h: 30,  type: 'wall' },
  { x: 1300, y: 440,  w: 200, h: 30,  type: 'wall' },
  { x: 1600, y: 440,  w: 200, h: 30,  type: 'wall' },
  { x: 600,  y: 1330, w: 200, h: 30,  type: 'wall' },
  { x: 900,  y: 1330, w: 200, h: 30,  type: 'wall' },
  { x: 1300, y: 1330, w: 200, h: 30,  type: 'wall' },
  { x: 1600, y: 1330, w: 200, h: 30,  type: 'wall' },

  // ─── Trees (circular collision) ───
  { x: 200,  y: 200,  w: 60, h: 60, type: 'tree' },
  { x: 480,  y: 250,  w: 60, h: 60, type: 'tree' },
  { x: 780,  y: 180,  w: 60, h: 60, type: 'tree' },
  { x: 1200, y: 200,  w: 60, h: 60, type: 'tree' },
  { x: 1600, y: 180,  w: 60, h: 60, type: 'tree' },
  { x: 2000, y: 200,  w: 60, h: 60, type: 'tree' },
  { x: 200,  y: 1600, w: 60, h: 60, type: 'tree' },
  { x: 480,  y: 1550, w: 60, h: 60, type: 'tree' },
  { x: 780,  y: 1620, w: 60, h: 60, type: 'tree' },
  { x: 1200, y: 1600, w: 60, h: 60, type: 'tree' },
  { x: 1600, y: 1620, w: 60, h: 60, type: 'tree' },
  { x: 2000, y: 1600, w: 60, h: 60, type: 'tree' },
  { x: 150,  y: 900,  w: 60, h: 60, type: 'tree' },
  { x: 2250, y: 900,  w: 60, h: 60, type: 'tree' },

  // ─── Bushes (no collision) ───
  { x: 550,  y: 550,  w: 40, h: 30, type: 'bush' },
  { x: 750,  y: 700,  w: 40, h: 30, type: 'bush' },
  { x: 1000, y: 600,  w: 40, h: 30, type: 'bush' },
  { x: 1450, y: 650,  w: 40, h: 30, type: 'bush' },
  { x: 1700, y: 550,  w: 40, h: 30, type: 'bush' },
  { x: 550,  y: 1200, w: 40, h: 30, type: 'bush' },
  { x: 900,  y: 1100, w: 40, h: 30, type: 'bush' },
  { x: 1400, y: 1150, w: 40, h: 30, type: 'bush' },
  { x: 1700, y: 1250, w: 40, h: 30, type: 'bush' },
];

export default class FightScene extends Phaser.Scene {
  private myId!: string;
  private initialRoomState!: any;
  private socket!: any;
  private onGameOver!: (winner: string | null) => void;

  private myPlayer!: any;
  private opponentPlayer!: any;
  private myHead!: Phaser.GameObjects.Image;
  private opponentHead!: Phaser.GameObjects.Image;
  
  private traps: any[] = [];
  private phaseText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  
  private keys!: any;

  private phase: string = 'wait';
  private phaseEndTime: number = 0;
  private isBurned = false;
  private isStunned = false;

  private isTraining: boolean = false;
  private tutorialStep: number = 0;
  private tutorialInstruction!: Phaser.GameObjects.Text;
  private minimap!: Phaser.Cameras.Scene2D.Camera;
  private radarText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'FightScene' });
  }

  init() {
    this.myId = this.registry.get('myId');
    this.initialRoomState = this.registry.get('initialRoomState');
    this.socket = this.registry.get('socket');
    this.onGameOver = this.registry.get('onGameOver');
  }

  preload() {
    Object.values(this.initialRoomState.players).forEach((p: any) => {
      if (p.faceImage) {
        this.load.image(`face_${p.id}`, p.faceImage);
      }
    });

    const g = this.add.graphics();
    // Face placeholder
    g.fillStyle(0xFFCC00, 1);
    g.fillCircle(20, 20, 20);
    g.fillStyle(0x000000, 1);
    g.fillCircle(12, 15, 3);
    g.fillCircle(28, 15, 3);
    g.lineStyle(2, 0x000000);
    g.beginPath(); g.arc(20, 25, 10, 0, Math.PI, false); g.strokePath();
    g.generateTexture('face_placeholder', 40, 40);
    g.clear();

    // Banana
    g.fillStyle(0xFFFF00, 1); g.fillEllipse(15, 10, 15, 5); g.generateTexture('trap_banana', 30, 20); g.clear();
    // Fake Treasure
    g.fillStyle(0xFF0000, 1); g.fillRect(0, 0, 30, 30); g.generateTexture('trap_fake', 30, 30); g.clear();
    // Real Treasure
    g.fillStyle(0xFFD700, 1); g.fillCircle(15, 15, 10); g.generateTexture('trap_real', 30, 30); g.clear();
    
    // Grid Background
    g.lineStyle(1, 0x2d5a1b, 1);
    for (let i = 0; i <= 64; i += 32) { g.moveTo(i, 0); g.lineTo(i, 64); g.moveTo(0, i); g.lineTo(64, i); }
    g.strokePath();
    g.fillStyle(0x3a6b22, 0.5); g.fillRect(0, 0, 64, 64);
    g.generateTexture('bg_grid', 64, 64);
    g.clear();

    // Map elements textures
    g.fillStyle(0xA0522D, 1); g.fillRect(0, 0, 64, 64); g.lineStyle(2, 0x5C3317, 1); g.strokeRect(0, 0, 64, 64); g.generateTexture('wall_tex', 64, 64); g.clear();
    g.fillStyle(0x888888, 1); g.fillCircle(24, 24, 20); g.lineStyle(2, 0x555555, 1); g.strokeCircle(24, 24, 20); g.generateTexture('rock_tex', 48, 48); g.clear();
    g.fillStyle(0x5C3317, 1); g.fillRect(18, 30, 12, 22); g.fillStyle(0x1a5c0a, 1); g.fillCircle(24, 22, 22); g.generateTexture('tree_tex', 48, 52); g.clear();
    g.fillStyle(0x2d7a1b, 1); g.fillEllipse(20, 14, 36, 24); g.generateTexture('bush_tex', 40, 28); g.clear();
    
    g.destroy();
  }

  create() {
    this.isTraining = this.registry.get('isTraining');
    if (this.isTraining) {
        this.phase = 'tutorial';
        this.tutorialStep = 1;
    }

    this.matter.world.setBounds(0, 0, MAP_W, MAP_H);
    this.matter.world.setGravity(0, 0);

    this.add.tileSprite(MAP_W/2, MAP_H/2, MAP_W, MAP_H, 'bg_grid').setDepth(-10);

    // Build map objects
    MAP_OBJECTS.forEach(obj => {
        const cx = obj.x + obj.w / 2;
        const cy = obj.y + obj.h / 2;
        if (obj.type === 'tree') {
            this.matter.add.circle(cx, cy, obj.w / 3, { isStatic: true, label: 'obstacle' });
            this.add.image(cx, cy, 'tree_tex').setDisplaySize(obj.w, obj.h + 10).setDepth(5);
        } else if (obj.type === 'rock') {
            this.matter.add.rectangle(cx, cy, obj.w, obj.h, { isStatic: true, label: 'obstacle', chamfer: { radius: 10 } });
            this.add.image(cx, cy, 'rock_tex').setDisplaySize(obj.w, obj.h).setDepth(5);
        } else if (obj.type === 'wall') {
            this.matter.add.rectangle(cx, cy, obj.w, obj.h, { isStatic: true, label: 'obstacle' });
            this.add.tileSprite(cx, cy, obj.w, obj.h, 'wall_tex').setDepth(5);
        } else if (obj.type === 'bush') {
            this.add.image(cx, cy, 'bush_tex').setDisplaySize(obj.w, obj.h).setDepth(15).setAlpha(0.85); // Bushes overlap players
        }
    });

    const p1Data = this.initialRoomState.players[this.myId];
    const oppId = Object.keys(this.initialRoomState.players).find(id => id !== this.myId) || 'dummy';
    const p2Data = this.initialRoomState.players[oppId];

    this.myPlayer = this.createTopDownPlayer(p1Data.x, p1Data.y, `face_${p1Data.id}`, p1Data.id);
    this.opponentPlayer = this.createTopDownPlayer(p2Data.x, p2Data.y, `face_${p2Data.id}`, p2Data.id);

    // Camera setup
    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.myHead, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.1);

    // Minimap
    this.minimap = this.cameras.add(this.scale.width - 160, 10, 150, 112).setBounds(0, 0, MAP_W, MAP_H).setZoom(150 / MAP_W);
    this.minimap.startFollow(this.myHead);
    this.minimap.setBackgroundColor(0x111111);
    this.minimap.setAlpha(0.7);

    if (this.input.keyboard) {
        this.keys = {
            W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            J: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
            K: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
            Q: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q)
        };
    }

    this.phaseText = this.add.text(this.scale.width / 2, 40, this.isTraining ? 'TRAINING' : 'WAITING FOR PLAYERS', { fontSize: '28px', color: '#fff', stroke: '#000', strokeThickness: 4 }).setScrollFactor(0).setOrigin(0.5).setDepth(20);
    this.timerText = this.add.text(this.scale.width / 2, 80, '', { fontSize: '24px', color: '#ff0', stroke: '#000', strokeThickness: 3 }).setScrollFactor(0).setOrigin(0.5).setDepth(20);
    this.radarText = this.add.text(this.scale.width / 2, 120, '', { fontSize: '22px', color: '#0ff', stroke: '#000', strokeThickness: 3 }).setScrollFactor(0).setOrigin(0.5).setDepth(20);
    this.tutorialInstruction = this.add.text(this.scale.width / 2, this.scale.height - 80, '', { fontSize: '20px', color: '#0f0', align: 'center', stroke: '#000', strokeThickness: 3 }).setScrollFactor(0).setOrigin(0.5).setDepth(20);

    this.add.text(10, this.scale.height - 30, this.isTraining ? 'WASD: di chuyển | J: Chuối | K: Báu vật | Q: Đổi nhân vật' : 'WASD di chuyển | J đặt chuối | K giấu kho báu', { fontSize: '14px', color: '#fff', stroke: '#000', strokeThickness: 2 }).setScrollFactor(0).setDepth(20);

    this.setupSocketListeners();

    this.matter.world.on('collisionstart', (event: any) => {
        event.pairs.forEach((pair: any) => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            console.log("COLLISION START", bodyA.label, bodyB.label);
            if (bodyA.label === 'my_player') { this.checkTrapCollision(bodyB); this.checkAttackCollision(bodyB); } 
            else if (bodyB.label === 'my_player') { this.checkTrapCollision(bodyA); this.checkAttackCollision(bodyA); }
        });
    });

    if (this.isTraining) {
        this.time.delayedCall(1000, () => {
            this.tutorialInstruction.setText('Chào mừng đến Trại Huấn Luyện!\nHãy dùng W A S D để di chuyển.');
        });
    }
  }

  createTopDownPlayer(x: number, y: number, faceKey: string, playerId: string) {
    const isMe = String(playerId) === String(this.myId);
    const prefix = isMe ? 'my' : 'opp';

    const body = this.matter.add.circle(x, y, 20, { 
       frictionAir: 0.1, 
       density: 0.05, 
       label: `${prefix}_player` 
    });

    const headKey = this.textures.exists(faceKey) ? faceKey : 'face_placeholder';
    const headImage = this.add.image(x, y, headKey);
    headImage.setDisplaySize(40, 40);
    
    const bodyGraphics = this.add.graphics();
    bodyGraphics.fillStyle(isMe ? 0x00aaff : 0xffaa00, 1);
    bodyGraphics.fillCircle(0, 0, 22);
    
    if (isMe) {
        this.myHead = headImage;
        this.myHead.setDepth(10);
        bodyGraphics.setDepth(9);
    } else {
        this.opponentHead = headImage;
        this.opponentHead.setDepth(10);
        bodyGraphics.setDepth(9);
    }

    return { body, headImage, bodyGraphics, id: playerId };
  }

  setupSocketListeners() {
    if (!this.socket) return;
    
    this.socket.on('phase_changed', (data: any) => {
        this.phase = data.phase;
        if (data.timeLimit) {
            this.phaseEndTime = this.time.now + data.timeLimit;
        } else {
            this.phaseEndTime = 0;
        }
        if (this.phase === 'phase1') this.phaseText.setText('PHASE 1: CHƠI DƠ');
        if (this.phase === 'phase2') this.phaseText.setText('PHASE 2: DÒ MÌN');
        if (this.phase === 'phase3') this.phaseText.setText('PHASE 3: HỦY DIỆT');
    });

    this.socket.on('treasure_stolen', (data: any) => {
        if (data.newOwnerId === this.myId) {
            this.tutorialInstruction.setText('BẠN ĐÃ CƯỚP ĐƯỢC BÁU VẬT!\nGIỮ NÓ TỚI HẾT GIỜ!');
            this.myHead.setTint(0xFFFF00);
            if (this.opponentHead) this.opponentHead.clearTint();
        } else {
            this.tutorialInstruction.setText('BÁU VẬT BỊ CƯỚP!\nĐẤM NÓ ĐỂ LẤY LẠI!');
            this.myHead.clearTint();
            if (this.opponentHead) this.opponentHead.setTint(0xFFFF00);
        }
    });

    this.socket.on('player_burned', (playerId: string) => {
        if (playerId === this.myId) {
            this.isBurned = true;
            this.myHead.setTint(0x333333);
        } else if (this.opponentHead) {
            this.opponentHead.setTint(0x333333);
        }
    });

    this.socket.on('opponent_disconnected', () => {
        if (this.onGameOver) {
            this.onGameOver(this.myId);
        }
    });

    this.socket.on('opponent_sync', (data: any) => {
       if (data.id !== this.myId && this.opponentPlayer) {
           this.matter.body.setPosition(this.opponentPlayer.body, { x: data.state.x, y: data.state.y });
       }
    });

    this.socket.on('trap_placed', (trap: any) => {
        // ALWAYS create the trap locally, even if it's ours, so we can see it
        this.placeTrapLocal(trap.type, trap.x, trap.y, trap.id, trap.ownerId);
    });

    this.socket.on('trap_triggered', (data: any) => {
        const { trapId, victimId } = data;
        const trapSprite = this.traps.find(t => t.getData('trapData').id === trapId);
        if (trapSprite) {
            trapSprite.destroy();
            this.traps = this.traps.filter(t => t !== trapSprite);
        }
        if (victimId === this.myId) {
            this.isBurned = true;
            this.isStunned = true;
            this.matter.body.setVelocity(this.myPlayer.body, { x: (Math.random()-0.5)*30, y: (Math.random()-0.5)*30 });
            this.myHead.setTint(0x333333);
            setTimeout(() => { this.isStunned = false; }, 800);
            setTimeout(() => { this.isBurned = false; this.myHead.clearTint(); }, 3000);
        } else if (victimId === this.opponentPlayer?.id) {
            this.opponentHead.setTint(0x333333);
            setTimeout(() => { if (this.opponentHead) this.opponentHead.clearTint(); }, 3000);
        }
    });

    this.socket.on('game_over', (data: any) => {
       if (this.onGameOver) {
           this.onGameOver(data.winner);
       }
    });
  }

  placeTrapLocal(type: string, x: number, y: number, id?: string, ownerId?: string) {
      const tex = type === 'banana' ? 'trap_banana' : type === 'fake_treasure' ? 'trap_fake' : 'trap_real';
      // Pass null for frame instead of undefined to ensure options are parsed correctly
      const sprite = this.matter.add.image(x, y, tex, null, { isStatic: true, isSensor: true, label: `trap_${id || Math.random()}` });
      sprite.setDepth(7);
      sprite.setData('trapData', { id: id || sprite.name, type, ownerId: ownerId || this.myId });
      this.traps.push(sprite);
      return sprite;
  }

  checkTrapCollision(body: any) {
      if (body.label.startsWith('trap_')) {
          const trapId = body.label.replace('trap_', '');
          const sprite = this.traps.find(t => t.getData('trapData').id === trapId);
          if (sprite) {
              const trapData = sprite.getData('trapData');
              if (!this.isTraining) {
                  this.socket.emit('trigger_trap', trapId);
              } else {
                  sprite.destroy();
                  this.traps = this.traps.filter(t => t !== sprite);
                  if (trapData.type === 'banana') {
                      this.isBurned = true;
                      this.isStunned = true;
                      this.matter.body.setVelocity(this.myPlayer.body, { x: (Math.random()-0.5)*30, y: (Math.random()-0.5)*30 });
                      this.myHead.setTint(0x333333);
                      setTimeout(() => { this.isStunned = false; }, 800);
                      setTimeout(() => { this.isBurned = false; this.myHead.clearTint(); }, 3000);
                  }
                  if (trapData.type === 'real_treasure' && this.phase === 'phase2') {
                      this.phase = 'phase3';
                      this.phaseText.setText('PHASE 3: HỦY DIỆT');
                  }
              }
          }
      }
  }

  checkAttackCollision(body: any) {
      if (this.phase === 'phase3' && (body.label === 'opp_player')) {
          if (Phaser.Input.Keyboard.JustDown(this.keys.J)) {
              if (!this.isTraining) this.socket.emit('attack_hit', { targetId: this.opponentPlayer.id });
              this.matter.body.applyForce(this.opponentPlayer.body, this.opponentPlayer.body.position, { 
                  x: (this.myPlayer.body.position.x < this.opponentPlayer.body.position.x ? 0.05 : -0.05), 
                  y: (this.myPlayer.body.position.y < this.opponentPlayer.body.position.y ? 0.05 : -0.05) 
              });
          }
      }
  }

  update(time: number, _delta: number) {
    if (!this.myPlayer || !this.myHead || !this.opponentHead) return;

    this.myHead.setPosition(this.myPlayer.body.position.x, this.myPlayer.body.position.y - 10);
    this.myPlayer.bodyGraphics.setPosition(this.myPlayer.body.position.x, this.myPlayer.body.position.y);

    if (this.opponentPlayer) {
        this.opponentHead.setPosition(this.opponentPlayer.body.position.x, this.opponentPlayer.body.position.y - 10);
        this.opponentPlayer.bodyGraphics.setPosition(this.opponentPlayer.body.position.x, this.opponentPlayer.body.position.y);
    }

    if (this.phase === 'phase1' || this.phase === 'phase2') {
       this.opponentHead.setVisible(false);
       this.opponentPlayer.bodyGraphics.setVisible(false);
    } else {
       this.opponentHead.setVisible(true);
       if (this.opponentPlayer) this.opponentPlayer.bodyGraphics.setVisible(true);
    }
    
    this.traps.forEach(t => {
        if (this.phase === 'phase2') {
            t.setVisible(false);
        } else if (this.phase === 'phase1' && t.getData('trapData').ownerId !== this.myId) {
            t.setVisible(false);
        } else {
            t.setVisible(true);
        }
    });

    if (this.phaseEndTime > 0) {
        const remaining = Math.max(0, Math.floor((this.phaseEndTime - time) / 1000));
        this.timerText.setText(`${remaining}s`);
    } else {
        this.timerText.setText('');
    }

    let vx = 0;
    let vy = 0;
    const speed = this.isBurned ? MOVE_SPEED * 0.4 : MOVE_SPEED;

    if (this.keys.A.isDown) vx = -speed;
    if (this.keys.D.isDown) vx = speed;
    if (this.keys.W.isDown) vy = -speed;
    if (this.keys.S.isDown) vy = speed;

    if (vx !== 0 && vy !== 0) {
        vx *= 0.707;
        vy *= 0.707;
    }

    if (!this.isStunned) {
        this.matter.body.setVelocity(this.myPlayer.body, { x: vx, y: vy });
    }

    this.matter.body.setAngle(this.myPlayer.body, 0);
    if (this.opponentPlayer) this.matter.body.setAngle(this.opponentPlayer.body, 0);

    // Radar Logic for Phase 2
    if (this.phase === 'phase2') {
        let realTreasure = this.traps.find(t => t.getData('trapData').type === 'real_treasure');
        if (realTreasure) {
            const dist = Phaser.Math.Distance.Between(
                this.myPlayer.body.position.x, this.myPlayer.body.position.y,
                realTreasure.x, realTreasure.y
            );
            if (dist < 150) this.radarText.setText('RADAR: Rất nóng! (Cực gần)');
            else if (dist < 400) this.radarText.setText('RADAR: Nóng (Gần)');
            else if (dist < 800) this.radarText.setText('RADAR: Ấm (Hơi xa)');
            else this.radarText.setText('RADAR: Lạnh ngắt (Rất xa)');
        } else {
            this.radarText.setText('RADAR: Đang dò tín hiệu...');
        }
    } else {
        this.radarText.setText('');
    }

    if (this.isTraining) {
        if (Phaser.Input.Keyboard.JustDown(this.keys.Q)) {
            // Swap control
            const tempPlayer = this.myPlayer;
            this.myPlayer = this.opponentPlayer;
            this.opponentPlayer = tempPlayer;

            const tempHead = this.myHead;
            this.myHead = this.opponentHead;
            this.opponentHead = tempHead;

            this.myId = this.myPlayer.id;

            // Camera snap
            this.cameras.main.startFollow(this.myHead, true, 0.1, 0.1);
            this.minimap.startFollow(this.myHead);

            this.showFloatingMsg(`Đã chuyển sang ${this.myId === 'player1' ? 'Player 1' : 'Dummy'}`, 0x00FF00);
        }

        if (this.tutorialStep === 1) {
            if (this.keys.A.isDown || this.keys.D.isDown || this.keys.W.isDown || this.keys.S.isDown) {
                this.tutorialStep = 2;
                setTimeout(() => {
                    this.phase = 'phase1';
                    this.phaseText.setText('PHASE 1: CHƠI DƠ');
                    this.tutorialInstruction.setText('Tốt lắm! Bây giờ hãy bấm J để đặt Vỏ Chuối.');
                }, 1500);
            }
        } else if (this.tutorialStep === 2 && this.phase === 'phase1') {
            if (Phaser.Input.Keyboard.JustDown(this.keys.J)) {
                this.placeTrapLocal('banana', this.myPlayer.body.position.x, this.myPlayer.body.position.y);
                this.tutorialStep = 3;
                this.tutorialInstruction.setText('Chuối sẽ làm kẻ thù trượt ngã!\nBây giờ bấm K để đặt Báu Vật (Thật hoặc Giả).');
            }
        } else if (this.tutorialStep === 3) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.K)) {
                const type = Math.random() > 0.5 ? 'real_treasure' : 'fake_treasure';
                this.placeTrapLocal(type, this.myPlayer.body.position.x, this.myPlayer.body.position.y);
                this.tutorialStep = 4;
                this.tutorialInstruction.setText('Quá đã! Giờ chúng ta sẽ chuyển sang Phase 2...');
                setTimeout(() => {
                    this.phase = 'phase2';
                    this.phaseText.setText('PHASE 2: DÒ MÌN');
                    this.tutorialStep = 5;
                    this.tutorialInstruction.setText('Mọi bẫy đều Tàng Hình!\nHãy thử đi lại và tự dẫm vào Vỏ Chuối của bạn xem :)');
                }, 2000);
            }
        } else if (this.tutorialStep === 6) {
            this.phase = 'phase3';
            this.phaseText.setText('PHASE 3: HỦY DIỆT');
            this.tutorialInstruction.setText('HAHA! Bị trượt vỏ chuối rồi!\nGiờ hãy chạy tới Dummy và bấm J để ĐẤM!');
        }
    } else {
        if (this.phase === 'phase1') {
            if (Phaser.Input.Keyboard.JustDown(this.keys.J)) {
                this.socket.emit('place_trap', { type: 'banana', x: this.myPlayer.body.position.x, y: this.myPlayer.body.position.y });
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.K)) {
                const type = Math.random() > 0.5 ? 'real_treasure' : 'fake_treasure';
                this.socket.emit('place_trap', { type: type, x: this.myPlayer.body.position.x, y: this.myPlayer.body.position.y });
            }
        }
    }

    if (time % 50 < 16) { 
        this.socket.emit('sync_state', {
            state: { x: this.myPlayer.body.position.x, y: this.myPlayer.body.position.y }
        });
    }
  }
}
