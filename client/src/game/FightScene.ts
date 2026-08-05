import Phaser from 'phaser';

export default class FightScene extends Phaser.Scene {
  private myId!: string;
  private initialRoomState!: any;
  private socket!: any;
  private onGameOver!: (winner: string | null) => void;

  private myPlayer!: any; // Ragdoll object
  private opponentPlayer!: any;
  private myHead!: Phaser.GameObjects.Image;
  private opponentHead!: Phaser.GameObjects.Image;
  
  private traps: any[] = [];
  private phaseText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  
  private keys!: any;
  // private myHpText!: Phaser.GameObjects.Text;
  // private opponentHpText!: Phaser.GameObjects.Text;

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
    // Ground
    g.fillStyle(0x333333, 1);
    g.fillRect(0, 0, 1600, 100);
    g.generateTexture('ground', 1600, 100);
    g.destroy();
  }

  create() {
    this.matter.world.setBounds(0, -1000, 1600, 1600);
    this.add.rectangle(800, 300, 1600, 1200, 0x1A1A2E);
    
    // Ground
    this.matter.add.image(800, 550, 'ground', undefined, { isStatic: true, label: 'ground' });

    const p1Data = this.initialRoomState.players[this.myId];
    const oppId = Object.keys(this.initialRoomState.players).find(id => id !== this.myId) || 'dummy';
    const p2Data = this.initialRoomState.players[oppId];

    this.myPlayer = this.createRagdoll(p1Data.x, 300, `face_${p1Data.id}`, p1Data.id);
    this.opponentPlayer = this.createRagdoll(p2Data.x, 300, `face_${p2Data.id}`, p2Data.id);

    this.cameras.main.setBounds(0, -1000, 1600, 1600);
    this.cameras.main.startFollow(this.myHead);

    if (this.input.keyboard) {
        this.keys = {
            W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
            J: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
            K: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
        };
    } else {
        this.keys = { W: {}, A: {}, S: {}, D: {}, SPACE: {}, J: {}, K: {} };
    }

    // UI
    this.phaseText = this.add.text(400, 50, 'WAITING...', { fontSize: '32px', color: '#FFF' }).setOrigin(0.5).setScrollFactor(0);
    this.timerText = this.add.text(400, 90, '', { fontSize: '24px', color: '#FFF' }).setOrigin(0.5).setScrollFactor(0);
    this.tutorialInstruction = this.add.text(400, 150, '', { fontSize: '20px', color: '#FFD700', align: 'center' }).setOrigin(0.5).setScrollFactor(0);

    this.setupSocketListeners();
    
    this.isTraining = this.registry.get('isTraining');
    if (this.isTraining) {
       // Start Tutorial Flow
       this.phase = 'tutorial';
       this.phaseText.setText('HƯỚNG DẪN CHƠI');
       this.tutorialInstruction.setText('Bấm phím A và D để di chuyển trái phải.\nBấm SPACE để nhảy.');
       this.tutorialStep = 1;
    }
    
    // Matter Collision Event
    this.matter.world.on('collisionstart', (event: any) => {
       event.pairs.forEach((pair: any) => {
           const bodyA = pair.bodyA;
           const bodyB = pair.bodyB;
           
           if (bodyA.label === 'my_torso' || bodyA.label === 'my_leg' || bodyA.label === 'my_head') {
               this.checkTrapCollision(bodyB);
               this.checkAttackCollision(bodyB);
           } else if (bodyB.label === 'my_torso' || bodyB.label === 'my_leg' || bodyB.label === 'my_head') {
               this.checkTrapCollision(bodyA);
               this.checkAttackCollision(bodyA);
           }
       });
    });
  }

  createRagdoll(x: number, y: number, faceKey: string, playerId: string) {
    const group = this.matter.world.nextGroup(true);
    const isMe = String(playerId) === String(this.myId);
    const prefix = isMe ? 'my' : 'opp';

    const torso = this.matter.add.rectangle(x, y, 30, 50, { 
       collisionFilter: { group: group }, density: 0.05, label: `${prefix}_torso` 
    });
    const head = this.matter.add.circle(x, y - 40, 20, { 
       collisionFilter: { group: group }, density: 0.01, label: `${prefix}_head` 
    });
    
    // Using image for head
    const faceImg = this.add.image(x, y - 40, this.textures.exists(faceKey) ? faceKey : 'face_placeholder');
    faceImg.setDisplaySize(40, 40);
    
    // Create physics constraint
    this.matter.add.constraint(torso, head, 40, 0.9, { pointA: { x: 0, y: -25 }, pointB: { x: 0, y: 15 } });

    const leftArm = this.matter.add.rectangle(x - 25, y, 10, 40, { collisionFilter: { group: group }, label: `${prefix}_arm` });
    const rightArm = this.matter.add.rectangle(x + 25, y, 10, 40, { collisionFilter: { group: group }, label: `${prefix}_arm` });
    this.matter.add.constraint(torso, leftArm, 5, 0.9, { pointA: { x: -15, y: -20 }, pointB: { x: 0, y: -15 } });
    this.matter.add.constraint(torso, rightArm, 5, 0.9, { pointA: { x: 15, y: -20 }, pointB: { x: 0, y: -15 } });

    const leftLeg = this.matter.add.rectangle(x - 10, y + 45, 12, 45, { collisionFilter: { group: group }, label: `${prefix}_leg`, friction: 0.1 });
    const rightLeg = this.matter.add.rectangle(x + 10, y + 45, 12, 45, { collisionFilter: { group: group }, label: `${prefix}_leg`, friction: 0.1 });
    this.matter.add.constraint(torso, leftLeg, 5, 0.9, { pointA: { x: -10, y: 25 }, pointB: { x: 0, y: -20 } });
    this.matter.add.constraint(torso, rightLeg, 5, 0.9, { pointA: { x: 10, y: 25 }, pointB: { x: 0, y: -20 } });

    // Link image to physics body in update
    if (isMe) {
       this.myHead = faceImg;
    } else {
       this.opponentHead = faceImg;
    }

    return { torso, head, leftArm, rightArm, leftLeg, rightLeg, faceImg, id: playerId };
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
       
       if (this.phase === 'phase1') {
           this.phaseText.setText('PHASE 1: CHƠI DƠ\nGiấu Đồ & Đặt Bẫy!');
       } else if (this.phase === 'phase2') {
           this.phaseText.setText('PHASE 2: DÒ MÌN\nBẫy Tàng Hình!');
       } else if (this.phase === 'phase3') {
           this.phaseText.setText(`PHASE 3: HỦY DIỆT\nGiữ Báu Vật!`);
       }
    });

    this.socket.on('opponent_sync', (data: any) => {
       if (this.opponentPlayer && data.parts) {
           this.matter.body.setPosition(this.opponentPlayer.torso, { x: data.parts.torso.x, y: data.parts.torso.y });
           this.matter.body.setAngle(this.opponentPlayer.torso, data.parts.torso.angle);
           // Simple sync for torso, other parts will naturally drag along, but for strict visual we sync all
           // To keep it simple, we just sync torso and head
           this.matter.body.setPosition(this.opponentPlayer.head, { x: data.parts.head.x, y: data.parts.head.y });
           if (this.opponentHead) {
               this.opponentHead.setPosition(data.parts.head.x, data.parts.head.y);
               this.opponentHead.setRotation(data.parts.head.angle);
           }
       }
    });

    this.socket.on('trap_placed', (trap: any) => {
       const sprite = this.matter.add.image(trap.x, trap.y, `trap_${trap.type.split('_')[0]}`, undefined, { isStatic: true, isSensor: true, label: `trap_${trap.id}` });
       sprite.setData('trapData', trap);
       this.traps.push(sprite);
    });

    this.socket.on('trap_triggered', (data: any) => {
       const trapIndex = this.traps.findIndex(t => t.getData('trapData').id === data.trapId);
       if (trapIndex !== -1) {
           this.traps[trapIndex].destroy();
           this.traps.splice(trapIndex, 1);
       }
       if (data.victimId === this.opponentPlayer.id && data.trapType === 'banana') {
           // Ragdoll opponent
           this.matter.body.applyForce(this.opponentPlayer.torso, this.opponentPlayer.torso.position, { x: 0, y: -0.1 });
       }
    });

    this.socket.on('player_burned', (playerId: string) => {
       if (playerId === this.myId && this.myHead) {
           this.isBurned = true;
           this.myHead.setTint(0x333333); // Black burned face
       } else if (this.opponentHead) {
           this.opponentHead.setTint(0x333333);
       }
    });

    this.socket.on('game_over', (data: any) => {
       if (this.onGameOver) {
           this.onGameOver(data.winner);
       }
    });
  }

  placeTrapLocal(type: string, x: number, y: number) {
      const trapId = `trap_${Date.now()}`;
      const trap = { id: trapId, ownerId: this.myId, type, x, y };
      const sprite = this.matter.add.image(trap.x, trap.y, `trap_${trap.type.split('_')[0]}`, undefined, { isStatic: true, isSensor: true, label: `trap_${trap.id}` });
      sprite.setData('trapData', trap);
      this.traps.push(sprite);
  }

  checkTrapCollision(body: any) {
      if (body.label.startsWith('trap_')) {
          const trapId = body.label.split('_')[1];
          const sprite = this.traps.find(t => t.getData('trapData').id === trapId);
          if (sprite) {
              const trapData = sprite.getData('trapData');
              if (trapData.ownerId !== this.myId || this.phase === 'phase2' || this.isTraining) { // Can trigger own traps in phase 2!
                 if (!this.isTraining) {
                     this.socket.emit('trigger_trap', trapId);
                 } else {
                     // Local trigger for tutorial
                     sprite.destroy();
                     this.traps = this.traps.filter(t => t !== sprite);
                 }
                 
                 // Apply local physics immediately
                 if (trapData.type === 'banana') {
                     this.matter.body.applyForce(this.myPlayer.torso, this.myPlayer.torso.position, { x: 0, y: -0.2 });
                     
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
      if (this.phase === 'phase3' && (body.label.includes('opp_'))) {
          // Send attack hit
          if (Phaser.Input.Keyboard.JustDown(this.keys.J)) {
              if (!this.isTraining) this.socket.emit('attack_hit', { targetId: this.opponentPlayer.id });
              // Push them
              this.matter.body.applyForce(this.opponentPlayer.torso, this.opponentPlayer.torso.position, { x: (this.myPlayer.torso.position.x < this.opponentPlayer.torso.position.x ? 0.05 : -0.05), y: -0.05 });
              
              if (this.isTraining && this.tutorialStep === 6) {
                  this.tutorialStep = 7;
                  this.tutorialInstruction.setText('Tuyệt vời! Bạn đã hoàn thành khóa huấn luyện.\nBây giờ bạn có thể Quit và tìm trận đấu thật!');
              }
          }
      }
  }

  update(time: number, _delta: number) {
    if (!this.myPlayer || !this.myHead || !this.opponentHead) return;

    this.myHead.setPosition(this.myPlayer.head.position.x, this.myPlayer.head.position.y);
    this.myHead.setRotation(this.myPlayer.head.angle);

    // Sync dummy head in training mode locally
    if (this.isTraining && this.opponentPlayer && this.opponentHead) {
        this.opponentHead.setPosition(this.opponentPlayer.head.position.x, this.opponentPlayer.head.position.y);
        this.opponentHead.setRotation(this.opponentPlayer.head.angle);
    }

    // Visibility logic (Phase 1 & 2 hide opponent)
    if (this.phase === 'phase1' || this.phase === 'phase2') {
       this.opponentHead.setVisible(false);
       // We can't easily hide matter bodies from debug draw, but we can ignore it in real game.
    } else {
       this.opponentHead.setVisible(true);
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

    // Movement
    let forceX = 0;
    const speed = this.isBurned ? 0.002 : 0.005;

    if (this.keys.A.isDown) forceX = -speed;
    if (this.keys.D.isDown) forceX = speed;
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
        if (this.myPlayer.leftLeg.velocity.y < 1 && this.myPlayer.leftLeg.velocity.y > -1) { // roughly on ground
            this.matter.body.applyForce(this.myPlayer.torso, this.myPlayer.torso.position, { x: 0, y: -0.08 });
        }
    }

    if (forceX !== 0) {
        this.matter.body.applyForce(this.myPlayer.torso, this.myPlayer.torso.position, { x: forceX, y: 0 });
    }
    
    // Keep torso and legs upright so the character stands perfectly
    this.matter.body.setAngle(this.myPlayer.torso, 0);
    this.matter.body.setAngle(this.myPlayer.leftLeg, 0);
    this.matter.body.setAngle(this.myPlayer.rightLeg, 0);
    
    if (this.opponentPlayer) {
        this.matter.body.setAngle(this.opponentPlayer.torso, 0);
        this.matter.body.setAngle(this.opponentPlayer.leftLeg, 0);
        this.matter.body.setAngle(this.opponentPlayer.rightLeg, 0);
    }

    // Tutorial State Machine
    if (this.isTraining) {
        if (this.tutorialStep === 1) {
            if (this.keys.A.isDown || this.keys.D.isDown) {
                this.tutorialStep = 2;
                setTimeout(() => {
                    this.phase = 'phase1';
                    this.phaseText.setText('PHASE 1: CHƠI DƠ');
                    this.tutorialInstruction.setText('Tốt lắm! Bây giờ hãy bấm J để đặt Vỏ Chuối.');
                }, 1500);
            }
        } else if (this.tutorialStep === 2 && this.phase === 'phase1') {
            if (Phaser.Input.Keyboard.JustDown(this.keys.J)) {
                this.placeTrapLocal('banana', this.myPlayer.torso.position.x, this.myPlayer.leftLeg.position.y + 10);
                this.tutorialStep = 3;
                this.tutorialInstruction.setText('Chuối sẽ làm kẻ thù trượt ngã!\nBây giờ bấm K để đặt Báu Vật (Thật hoặc Giả).');
            }
        } else if (this.tutorialStep === 3) {
            if (Phaser.Input.Keyboard.JustDown(this.keys.K)) {
                const type = Math.random() > 0.5 ? 'real_treasure' : 'fake_treasure';
                this.placeTrapLocal(type, this.myPlayer.torso.position.x, this.myPlayer.leftLeg.position.y + 10);
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
            // Wait for user to trigger trap (checked in checkTrapCollision)
            this.phase = 'phase3';
            this.phaseText.setText('PHASE 3: HỦY DIỆT');
            this.tutorialInstruction.setText('HAHA! Bị trượt vỏ chuối rồi!\nGiờ hãy chạy tới Dummy và bấm J để ĐẤM!');
        }
    } else {
        // Online Trap placing
        if (this.phase === 'phase1') {
            if (Phaser.Input.Keyboard.JustDown(this.keys.J)) {
                this.socket.emit('place_trap', { type: 'banana', x: this.myPlayer.torso.position.x, y: this.myPlayer.leftLeg.position.y + 10 });
            }
            if (Phaser.Input.Keyboard.JustDown(this.keys.K)) {
                const type = Math.random() > 0.5 ? 'real_treasure' : 'fake_treasure';
                this.socket.emit('place_trap', { type: type, x: this.myPlayer.torso.position.x, y: this.myPlayer.leftLeg.position.y + 10 });
            }
        }
    }

    // Sync
    if (time % 50 < 16) { // ~20fps sync
        this.socket.emit('sync_state', {
            parts: {
                torso: { x: this.myPlayer.torso.position.x, y: this.myPlayer.torso.position.y, angle: this.myPlayer.torso.angle },
                head: { x: this.myPlayer.head.position.x, y: this.myPlayer.head.position.y, angle: this.myPlayer.head.angle }
            }
        });
    }
  }
}
