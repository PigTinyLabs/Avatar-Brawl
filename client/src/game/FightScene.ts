import Phaser from 'phaser';

export default class FightScene extends Phaser.Scene {
  private myId!: string;
  private initialRoomState!: any;
  private socket!: any;
  private onGameOver!: (winner: string | null) => void;

  private myPlayer!: any; // { body, headImage, bodyGraphics, id }
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

  // Tutorial state
  private isTraining: boolean = false;
  private tutorialStep: number = 0;
  private tutorialInstruction!: Phaser.GameObjects.Text;

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

    // Trap textures
    const g = this.add.graphics();

    // Face placeholder (smiley)
    g.fillStyle(0xFFCC00, 1);
    g.fillCircle(20, 20, 20);
    g.fillStyle(0x000000, 1);
    g.fillCircle(12, 15, 3); // left eye
    g.fillCircle(28, 15, 3); // right eye
    g.lineStyle(2, 0x000000);
    g.beginPath();
    g.arc(20, 25, 10, 0, Math.PI, false); // smile
    g.strokePath();
    g.generateTexture('face_placeholder', 40, 40);
    g.clear();

    // Banana
    g.fillStyle(0xFFFF00, 1);
    g.fillEllipse(15, 10, 15, 5);
    g.generateTexture('trap_banana', 30, 20);
    g.clear();
    // Fake Treasure
    g.fillStyle(0xFF0000, 1);
    g.fillRect(0, 0, 30, 30);
    g.generateTexture('trap_fake', 30, 30);
    g.clear();
    // Real Treasure
    g.fillStyle(0xFFD700, 1);
    g.fillCircle(15, 15, 10);
    g.generateTexture('trap_real', 30, 30);
    g.clear();
    
    // Background Grid for Top-Down
    g.lineStyle(1, 0x333333, 1);
    for (let i = 0; i <= 1600; i += 50) {
        g.moveTo(i, 0); g.lineTo(i, 1200);
    }
    for (let j = 0; j <= 1200; j += 50) {
        g.moveTo(0, j); g.lineTo(1600, j);
    }
    g.strokePath();
    g.generateTexture('bg_grid', 1600, 1200);
    g.clear();
  }

  create() {
    this.isTraining = this.registry.get('isTraining');
    if (this.isTraining) {
        this.phase = 'tutorial';
        this.tutorialStep = 1;
        this.time.delayedCall(1000, () => {
            this.tutorialInstruction.setText('Chào mừng đến Trại Huấn Luyện!\nHãy dùng W A S D để di chuyển.');
        });
    }

    // Set world bounds (Top-Down Arena)
    this.matter.world.setBounds(0, 0, 1600, 1200);
    this.add.image(800, 600, 'bg_grid').setDepth(-10);

    const p1Data = this.initialRoomState.players[this.myId];
    const oppId = Object.keys(this.initialRoomState.players).find(id => id !== this.myId) || 'dummy';
    const p2Data = this.initialRoomState.players[oppId];

    this.myPlayer = this.createTopDownPlayer(p1Data.x, p1Data.y, `face_${p1Data.id}`, p1Data.id);
    this.opponentPlayer = this.createTopDownPlayer(p2Data.x, p2Data.y, `face_${p2Data.id}`, p2Data.id);
    
    // Expose for E2E testing
    (window as any).fightScene = this;

    this.cameras.main.setBounds(0, 0, 1600, 1200);
    this.cameras.main.startFollow(this.myHead);

    if (this.input.keyboard) {
        this.keys = {
            W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            J: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
            K: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K)
        };
    }

    this.phaseText = this.add.text(400, 50, this.isTraining ? 'TRAINING' : 'WAITING FOR PLAYERS', { fontSize: '24px', color: '#fff' }).setScrollFactor(0).setOrigin(0.5).setDepth(20);
    this.timerText = this.add.text(400, 90, '', { fontSize: '32px', color: '#ff0' }).setScrollFactor(0).setOrigin(0.5).setDepth(20);
    this.tutorialInstruction = this.add.text(400, 150, '', { fontSize: '18px', color: '#0f0', align: 'center' }).setScrollFactor(0).setOrigin(0.5).setDepth(20);

    // Socket Events
    this.socket.on('phase_change', (data: any) => {
        this.phase = data.phase;
        this.phaseEndTime = data.endTime;
        if (this.phase === 'phase1') this.phaseText.setText('PHASE 1: CHƠI DƠ');
        if (this.phase === 'phase2') this.phaseText.setText('PHASE 2: DÒ MÌN');
        if (this.phase === 'phase3') this.phaseText.setText('PHASE 3: HỦY DIỆT');
    });

    this.socket.on('opponent_sync', (data: any) => {
       if (data.id !== this.myId && this.opponentPlayer) {
           this.matter.body.setPosition(this.opponentPlayer.body, { x: data.state.x, y: data.state.y });
       }
    });

    this.socket.on('trap_placed', (trap: any) => {
        if (trap.ownerId !== this.myId) {
            this.placeTrapLocal(trap.type, trap.x, trap.y, trap.id, trap.ownerId);
        }
    });

    this.socket.on('trap_triggered', (data: any) => {
        const { trapId, victimId } = data;
        const trapSprite = this.traps.find(t => t.getData('trapData').id === trapId);
        if (trapSprite) {
            trapSprite.destroy();
            this.traps = this.traps.filter(t => t !== trapSprite);
        }
        if (victimId === this.myId) {
            this.matter.body.applyForce(this.myPlayer.body, this.myPlayer.body.position, { x: (Math.random() - 0.5) * 0.1, y: -0.1 }); // knockback
            this.isBurned = true;
            this.myHead.setTint(0x333333);
        } else if (victimId === this.opponentPlayer?.id) {
            this.opponentHead.setTint(0x333333);
        }
    });

    this.socket.on('game_over', (data: any) => {
       if (this.onGameOver) {
           this.onGameOver(data.winner);
       }
    });
    
    // Setup Mobile Input
    window.addEventListener('mobile_input', ((e: CustomEvent) => {
        const { key, state } = e.detail;
        if (this.keys && this.keys[key]) {
             if (state === 'down') this.keys[key].isDown = true;
             else this.keys[key].isDown = false;
        }
    }) as EventListener);

    // Matter Collision Event
    this.matter.world.on('collisionstart', (event: any) => {
        event.pairs.forEach((pair: any) => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            if (bodyA.label === 'my_player') {
                this.checkTrapCollision(bodyB);
                this.checkAttackCollision(bodyB);
            } else if (bodyB.label === 'my_player') {
                this.checkTrapCollision(bodyA);
                this.checkAttackCollision(bodyA);
            }
        });
     });

     this.matter.world.on('collisionactive', (event: any) => {
        event.pairs.forEach((pair: any) => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            if (bodyA.label === 'my_player') {
                this.checkTrapCollision(bodyB);
            } else if (bodyB.label === 'my_player') {
                this.checkTrapCollision(bodyA);
            }
        });
     });
  }

  createTopDownPlayer(x: number, y: number, faceKey: string, playerId: string) {
    const isMe = String(playerId) === String(this.myId);
    const prefix = isMe ? 'my' : 'opp';

    // Single physics body for top-down
    const body = this.matter.add.circle(x, y, 20, { 
       frictionAir: 0.1, 
       density: 0.05, 
       label: `${prefix}_player` 
    });

    const headKey = this.textures.exists(faceKey) ? faceKey : 'face_placeholder';
    const headImage = this.add.image(x, y, headKey);
    headImage.setDisplaySize(40, 40);
    
    // Draw body beneath head
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

  placeTrapLocal(type: string, x: number, y: number, forceId?: string, forceOwner?: string) {
      const trapId = forceId || `trap_${Date.now()}`;
      const owner = forceOwner || this.myId;
      const trap = { id: trapId, ownerId: owner, type, x, y };
      const sprite = this.matter.add.image(trap.x, trap.y, `trap_${trap.type.split('_')[0]}`, undefined, { isStatic: true, isSensor: true, label: trap.id });
      sprite.setData('trapData', trap);
      sprite.setDepth(5);
      this.traps.push(sprite);
  }

  checkTrapCollision(body: any) {
      if (body.label.startsWith('trap_')) {
          const trapId = body.label;
          const sprite = this.traps.find(t => t.getData('trapData').id === trapId);
          if (sprite) {
              const trapData = sprite.getData('trapData');
              
              // Only allow triggering own traps in phase 2, or in training if we are at step 5
              const canTrigger = trapData.ownerId !== this.myId || this.phase === 'phase2' || (this.isTraining && this.tutorialStep >= 5);
              
              if (canTrigger) {
                 if (!this.isTraining) {
                     this.socket.emit('trigger_trap', trapId);
                 } else {
                     // Local trigger for tutorial
                     sprite.destroy();
                     this.traps = this.traps.filter(t => t !== sprite);
                 }
                 
                 // Apply local physics immediately
                 if (trapData.type === 'banana') {
                     // Knockback in top down
                     this.matter.body.applyForce(this.myPlayer.body, this.myPlayer.body.position, { x: (Math.random() - 0.5) * 0.1, y: -0.1 });
                     
                     if (this.isTraining && this.tutorialStep === 5) {
                         this.tutorialStep = 6;
                     }
                 }
              }
          }
      }
  }

  checkAttackCollision(body: any) {
      // In phase 3, if we touch opponent, it's an attack
      if (this.phase === 'phase3' && (body.label === 'opp_player')) {
          // Send attack hit
          if (Phaser.Input.Keyboard.JustDown(this.keys.J)) {
              if (!this.isTraining) this.socket.emit('attack_hit', { targetId: this.opponentPlayer.id });
              // Push them
              this.matter.body.applyForce(this.opponentPlayer.body, this.opponentPlayer.body.position, { 
                  x: (this.myPlayer.body.position.x < this.opponentPlayer.body.position.x ? 0.05 : -0.05), 
                  y: (this.myPlayer.body.position.y < this.opponentPlayer.body.position.y ? 0.05 : -0.05) 
              });
              
              if (this.isTraining && this.tutorialStep === 6) {
                  this.tutorialStep = 7;
                  this.tutorialInstruction.setText('Tuyệt vời! Bạn đã hoàn thành khóa huấn luyện.\nBây giờ bạn có thể Quit và tìm trận đấu thật!');
              }
          }
      }
  }

  update(time: number, _delta: number) {
    if (!this.myPlayer || !this.myHead || !this.opponentHead) return;

    // Sync visual head and body graphics to physics body
    this.myHead.setPosition(this.myPlayer.body.position.x, this.myPlayer.body.position.y - 10);
    this.myPlayer.bodyGraphics.setPosition(this.myPlayer.body.position.x, this.myPlayer.body.position.y);

    if (this.opponentPlayer) {
        this.opponentHead.setPosition(this.opponentPlayer.body.position.x, this.opponentPlayer.body.position.y - 10);
        this.opponentPlayer.bodyGraphics.setPosition(this.opponentPlayer.body.position.x, this.opponentPlayer.body.position.y);
    }

    // Visibility logic (Phase 1 & 2 hide opponent)
    if (this.phase === 'phase1' || this.phase === 'phase2') {
       this.opponentHead.setVisible(false);
       this.opponentPlayer.bodyGraphics.setVisible(false);
    } else {
       this.opponentHead.setVisible(true);
       if (this.opponentPlayer) this.opponentPlayer.bodyGraphics.setVisible(true);
    }
    
    // Hide traps in Phase 2
    this.traps.forEach(t => {
        if (this.phase === 'phase2') {
            t.setVisible(false);
        } else if (this.phase === 'phase1' && t.getData('trapData').ownerId !== this.myId) {
            t.setVisible(false); // Hide opponent's traps in phase 1
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

    // Movement (Top-Down 4 directions)
    let forceX = 0;
    let forceY = 0;
    const speed = this.isBurned ? 0.002 : 0.005;

    if (this.keys.A.isDown) forceX = -speed;
    if (this.keys.D.isDown) forceX = speed;
    if (this.keys.W.isDown) forceY = -speed;
    if (this.keys.S.isDown) forceY = speed;

    if (forceX !== 0 || forceY !== 0) {
        this.matter.body.applyForce(this.myPlayer.body, this.myPlayer.body.position, { x: forceX, y: forceY });
    }

    // Lock rotation for top-down bodies so they don't spin wildly
    this.matter.body.setAngle(this.myPlayer.body, 0);
    if (this.opponentPlayer) this.matter.body.setAngle(this.opponentPlayer.body, 0);

    // Tutorial State Machine
    if (this.isTraining) {
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
        // Online Trap placing
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

    // Sync
    if (time % 50 < 16) { // ~20fps sync
        this.socket.emit('sync_state', {
            state: { x: this.myPlayer.body.position.x, y: this.myPlayer.body.position.y }
        });
    }
  }
}
