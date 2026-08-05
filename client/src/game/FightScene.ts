import Phaser from 'phaser';
import { database } from '../firebase';
import { ref, onValue, set, update, get, remove } from 'firebase/database';

const SKILLS: Record<string, any> = {
  boxing: {
    J: { code: 'J', name: 'Punch', damage: 10, reach: 60, duration: 300, color: 0xFF5555, dash: 0, stun: 0 },
    K: { code: 'd_J', name: 'Uppercut', damage: 15, reach: 50, duration: 400, color: 0xFF0055, dash: 0, stun: 0 },
    L: { code: 'f_J', name: 'Heavy Punch', damage: 25, reach: 70, duration: 600, color: 0xFF8800, dash: 200, stun: 500 },
    s_f_J: { code: 's_f_J', name: 'Ki Blast', damage: 30, reach: 800, duration: 1000, color: 0xFFFFFF, dash: 0, stun: 0, isProjectile: true, projSpeed: 600 }
  },
  karate: {
    J: { code: 'J', name: 'Straight Punch', damage: 10, reach: 60, duration: 300, color: 0x55FF55, dash: 0, stun: 0 },
    K: { code: 'K', name: 'Roundhouse Kick', damage: 15, reach: 80, duration: 400, color: 0x00FF88, dash: 0, stun: 0 },
    L: { code: 'f_K', name: 'Flying Kick', damage: 25, reach: 100, duration: 600, color: 0x00FFFF, dash: 400, stun: 500 },
    s_f_J: { code: 's_f_J', name: 'Ki Blast', damage: 30, reach: 800, duration: 1000, color: 0x00FFFF, dash: 0, stun: 0, isProjectile: true, projSpeed: 600 }
  }
};

export default class FightScene extends Phaser.Scene {
  private roomId!: string;
  private myId!: string;
  private opponentId!: string;
  private initialRoomState!: any;
  
  private myPlayer!: Phaser.Physics.Arcade.Sprite;
  private opponentPlayer!: Phaser.Physics.Arcade.Sprite;
  
  private myStickman!: Phaser.GameObjects.Graphics;
  private opponentStickman!: Phaser.GameObjects.Graphics;
  
  private myHead!: Phaser.GameObjects.Image;
  private opponentHead!: Phaser.GameObjects.Image;
  private myMaskShape!: Phaser.GameObjects.Graphics;
  private opponentMaskShape!: Phaser.GameObjects.Graphics;

  private cursors!: any;
  private keys!: any;

  private myHpText!: Phaser.GameObjects.Text;
  private opponentHpText!: Phaser.GameObjects.Text;
  private myShield!: Phaser.GameObjects.Arc;
  private opponentShield!: Phaser.GameObjects.Arc;

  private onGameOverCallback!: () => void;
  private gameOverProcessed = false;
  
  private myState: 'idle' | 'moving' | 'attacking' | 'blocking' | 'stunned' | 'crouching' = 'idle';
  private opponentState: 'idle' | 'moving' | 'attacking' | 'blocking' | 'stunned' | 'crouching' = 'idle';
  
  private myActiveSkill: any = null;
  private opponentActiveSkill: any = null;
  private isAttacking = false;
  private stunTimer: Phaser.Time.TimerEvent | null = null;
  
  private lastSentData = { x: 0, y: 0, flipX: false, state: 'idle' };
  
  private myProjectiles: Phaser.Physics.Arcade.Group | null = null;

  constructor() {
    super({ key: 'FightScene' });
  }

  init() {
    this.roomId = this.registry.get('roomId');
    this.myId = this.registry.get('myId');
    this.initialRoomState = this.registry.get('initialRoomState');
    this.onGameOverCallback = this.registry.get('onGameOver');

    const playerIds = Object.keys(this.initialRoomState.players);
    this.opponentId = playerIds.find(id => id !== this.myId) || '';
  }

  preload() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x00F0FF, 1);
    graphics.fillRect(0, 0, 40, 80);
    graphics.generateTexture('body_blue', 40, 80);
    graphics.clear();
    graphics.fillStyle(0xFF3366, 1);
    graphics.fillRect(0, 0, 40, 80);
    graphics.generateTexture('body_red', 40, 80);
    graphics.clear();
    
    // Default Face
    graphics.fillStyle(0xCCCCCC, 1);
    graphics.fillCircle(25, 25, 25);
    graphics.lineStyle(2, 0x000000);
    graphics.strokeCircle(25, 25, 25);
    graphics.fillStyle(0x000000);
    graphics.fillCircle(15, 20, 3);
    graphics.fillCircle(35, 20, 3);
    graphics.beginPath();
    graphics.arc(25, 30, 10, 0, Math.PI);
    graphics.strokePath();
    graphics.generateTexture('default_face', 50, 50);
    graphics.clear();

    // Ki Blast Energy Ball
    graphics.fillStyle(0xFFFFFF, 1);
    graphics.fillCircle(15, 15, 5); // core
    graphics.fillStyle(0xFFFFFF, 0.4);
    graphics.fillCircle(15, 15, 10); // inner glow
    graphics.fillStyle(0xFFFFFF, 0.2);
    graphics.fillCircle(15, 15, 15); // outer glow
    graphics.generateTexture('energy_ball', 30, 30);
    
    graphics.destroy();
  }

  create() {
    this.add.rectangle(400, 300, 800, 600, 0x1A1A2E);
    
    const ground = this.physics.add.staticGroup();
    const groundRect = this.add.rectangle(400, 580, 800, 40, 0x222244);
    ground.add(groundRect);
    
    this.myProjectiles = this.physics.add.group();

    const myData = this.initialRoomState.players[this.myId];
    const opponentData = this.initialRoomState.players[this.opponentId];

    let loadingCount = 0;
    const checkStart = () => {
       loadingCount--;
       if (loadingCount <= 0 && !this.myPlayer) this.spawnPlayers(myData, opponentData, ground);
    };

    if (myData.faceImage) {
        loadingCount++;
        this.textures.addBase64(`face_${this.myId}`, myData.faceImage);
    }
    if (opponentData.faceImage) {
        loadingCount++;
        this.textures.addBase64(`face_${this.opponentId}`, opponentData.faceImage);
    }

    if (loadingCount === 0) {
        this.spawnPlayers(myData, opponentData, ground);
    } else {
        this.textures.on('addtexture', checkStart);
        this.time.delayedCall(1000, () => {
           if (!this.myPlayer) this.spawnPlayers(myData, opponentData, ground);
        });
    }

    if (this.input.keyboard) {
        this.keys = {
            W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            J: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
            K: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.K),
            L: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.L),
            U: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U)
        };
    }

    this.myHpText = this.add.text(20, 20, `You (HP: ${myData.hp})`, { fontSize: '24px', color: '#00F0FF' });
    this.opponentHpText = this.add.text(500, 20, `Opponent (HP: ${opponentData.hp})`, { fontSize: '24px', color: '#FF3366' });
    
    this.add.text(20, 60, `Martial Art: ${myData.martialArt.toUpperCase()}`, { fontSize: '16px', color: '#888' });
    this.add.text(500, 60, `Martial Art: ${opponentData.martialArt.toUpperCase()}`, { fontSize: '16px', color: '#888' });

    this.setupFirebaseListeners();
  }

  setupFirebaseListeners() {
    const opponentRef = ref(database, `rooms/${this.roomId}/players/${this.opponentId}`);
    onValue(opponentRef, (snap) => {
      const data = snap.val();
      if (data && this.opponentPlayer && this.opponentHead) {
        this.opponentPlayer.setPosition(data.x, data.y);
        this.opponentPlayer.setFlipX(data.flipX);
        this.opponentHpText.setText(`Opponent (HP: ${data.hp})`);
        this.opponentState = data.state;
        this.opponentShield.setAlpha(this.opponentState === 'blocking' ? 0.4 : 0);
      }
    });
    
    const myRef = ref(database, `rooms/${this.roomId}/players/${this.myId}/hp`);
    onValue(myRef, (snap) => {
      const hp = snap.val();
      if (hp !== null) {
        this.myHpText.setText(`You (HP: ${hp})`);
        if (hp <= 0) {
          set(ref(database, `rooms/${this.roomId}/status`), 'game_over');
          set(ref(database, `rooms/${this.roomId}/winner`), this.opponentId);
        }
      }
    });

    const attackRef = ref(database, `rooms/${this.roomId}/attacks/${this.opponentId}`);
    onValue(attackRef, (snap) => {
      const data = snap.val();
      if (data && this.opponentPlayer && data.ts > Date.now() - 2000) {
        this.opponentActiveSkill = data.skillData;
        this.showAttackEffect(this.opponentPlayer, data.skillData, data.flipX);
        this.time.delayedCall(data.skillData.duration, () => {
           this.opponentActiveSkill = null;
        });
      }
    });
    
    const myStunRef = ref(database, `rooms/${this.roomId}/players/${this.myId}/stunnedUntil`);
    onValue(myStunRef, (snap) => {
       const stunnedUntil = snap.val();
       if (stunnedUntil && stunnedUntil > Date.now()) {
           this.myState = 'stunned';
           if (this.stunTimer) this.stunTimer.remove(false);
           this.stunTimer = this.time.delayedCall(stunnedUntil - Date.now(), () => {
               this.myState = 'idle';
           });
       }
    });

    const statusRef = ref(database, `rooms/${this.roomId}/status`);
    onValue(statusRef, (snap) => {
      const status = snap.val();
      if (status === 'game_over' && !this.gameOverProcessed) {
         this.gameOverProcessed = true;
         get(ref(database, `rooms/${this.roomId}/winner`)).then((winnerSnap) => {
            const winner = winnerSnap.val();
            const isWin = winner === this.myId;
            const textToDisplay = isWin ? "You Win!" : "You Lose!";
            this.add.text(400, 300, textToDisplay, { fontSize: '64px', color: '#FFF', fontStyle: 'bold' }).setOrigin(0.5);
            
            set(ref(database, `users/${this.myId}/history/${this.roomId}`), {
               ts: Date.now(),
               opponentId: this.opponentId,
               myMartialArt: this.initialRoomState.players[this.myId].martialArt,
               result: isWin ? 'win' : 'lose'
            });

            this.time.delayedCall(3000, () => {
              remove(ref(database, `rooms/${this.roomId}`));
              this.onGameOverCallback();
            });
         });
      }
    });
  }

  spawnPlayers(myData: any, opponentData: any, ground: Phaser.Physics.Arcade.StaticGroup) {
    if (this.myPlayer) return;

    this.myPlayer = this.physics.add.sprite(myData.x, myData.y, 'body_blue').setAlpha(0);
    this.myPlayer.setCollideWorldBounds(true);
    this.physics.add.collider(this.myPlayer, ground);
    
    this.opponentPlayer = this.physics.add.sprite(opponentData.x, opponentData.y, 'body_red').setAlpha(0);
    this.opponentPlayer.setCollideWorldBounds(true);
    this.physics.add.collider(this.opponentPlayer, ground);
    
    this.opponentPlayer.setFlipX(opponentData.isLeft);
    this.myPlayer.setFlipX(myData.isLeft);
    
    this.myStickman = this.add.graphics();
    this.opponentStickman = this.add.graphics();

    this.myMaskShape = this.make.graphics();
    this.myMaskShape.fillStyle(0xffffff).fillCircle(0, 0, 25);
    
    this.opponentMaskShape = this.make.graphics();
    this.opponentMaskShape.fillStyle(0xffffff).fillCircle(0, 0, 25);

    const myFaceKey = this.textures.exists(`face_${this.myId}`) ? `face_${this.myId}` : 'default_face';
    this.myHead = this.add.image(this.myPlayer.x, this.myPlayer.y - 45, myFaceKey);
    this.myHead.setDisplaySize(50, 50).setMask(this.myMaskShape.createGeometryMask());

    const opponentFaceKey = this.textures.exists(`face_${this.opponentId}`) ? `face_${this.opponentId}` : 'default_face';
    this.opponentHead = this.add.image(this.opponentPlayer.x, this.opponentPlayer.y - 45, opponentFaceKey);
    this.opponentHead.setDisplaySize(50, 50).setMask(this.opponentMaskShape.createGeometryMask());
    
    this.myShield = this.add.circle(0, 0, 60, 0x00F0FF, 0.4).setAlpha(0);
    this.opponentShield = this.add.circle(0, 0, 60, 0xFF3366, 0.4).setAlpha(0);
  }

  update(time: number) {
    if (!this.myPlayer || !this.keys) return;

    this.updateHeadsAndShields();
    this.drawStickman(this.myStickman, this.myPlayer, this.myState, this.myActiveSkill, 0x00F0FF, time);
    this.drawStickman(this.opponentStickman, this.opponentPlayer, this.opponentState, this.opponentActiveSkill, 0xFF3366, time);

    this.handleProjectiles();

    if (this.myState === 'stunned' || this.isAttacking) {
      if (this.myState === 'stunned') this.myPlayer.setVelocityX(0);
      this.syncFirebase();
      return;
    }

    let velocityX = 0;
    let flipX = this.myPlayer.flipX;
    let isMoving = false;

    if (this.keys.A.isDown) { velocityX = -200; flipX = true; isMoving = true; }
    else if (this.keys.D.isDown) { velocityX = 200; flipX = false; isMoving = true; }

    this.myPlayer.setVelocityX(velocityX);
    this.myPlayer.setFlipX(flipX);

    if (this.keys.U.isDown && this.myPlayer.body?.touching.down) {
      this.myState = 'blocking';
      this.myShield.setAlpha(0.4);
      this.myPlayer.setVelocityX(0); // Cannot move while blocking
    } else {
      if (this.keys.W.isDown && this.myPlayer.body?.touching.down) {
        this.myPlayer.setVelocityY(-500);
        isMoving = true;
      }
      
      if (this.keys.S.isDown) {
        this.myState = 'crouching';
        this.myPlayer.setVelocityX(0); // Optional: stop moving when crouching
      } else {
        this.myState = isMoving ? 'moving' : 'idle';
      }
      this.myShield.setAlpha(0);
    }

    const martialArt = this.initialRoomState.players[this.myId].martialArt;
    const artSkills = SKILLS[martialArt] || SKILLS.boxing;
    
    const isForwardDown = (!flipX && this.keys.D.isDown) || (flipX && this.keys.A.isDown);
    const isDownDown = this.keys.S.isDown;
    
    let skillCode = null;
    const jPressed = Phaser.Input.Keyboard.JustDown(this.keys.J);
    const kPressed = Phaser.Input.Keyboard.JustDown(this.keys.K);
    const lPressed = Phaser.Input.Keyboard.JustDown(this.keys.L);
    
    // Combo check first
    if (jPressed && isDownDown && isForwardDown) {
        skillCode = 's_f_J';
    } else if (jPressed) {
        skillCode = 'J';
    } else if (kPressed) {
        skillCode = 'K';
    } else if (lPressed) {
        skillCode = 'L';
    }
    
    if (skillCode && artSkills[skillCode]) {
      this.performAttack(artSkills[skillCode]);
    }

    this.syncFirebase();
  }
  
  updateHeadsAndShields() {
    if (this.myHead) {
      // Lower head if sweeping, flying kicking, or crouching
      const isCrouching = this.myState === 'crouching' || (this.myState === 'attacking' && (this.myActiveSkill?.code === 'd_K' || this.myActiveSkill?.code === 'f_K'));
      const yOffset = isCrouching ? -20 : -45;
      this.myHead.setPosition(this.myPlayer.x, this.myPlayer.y + yOffset);
      this.myHead.setFlipX(this.myPlayer.flipX);
      this.myMaskShape.x = this.myPlayer.x;
      this.myMaskShape.y = this.myPlayer.y + yOffset;
    }
    if (this.opponentHead && this.opponentPlayer) {
      const isCrouching = this.opponentState === 'crouching' || (this.opponentState === 'attacking' && (this.opponentActiveSkill?.code === 'd_K' || this.opponentActiveSkill?.code === 'f_K'));
      const yOffset = isCrouching ? -20 : -45;
      this.opponentHead.setPosition(this.opponentPlayer.x, this.opponentPlayer.y + yOffset);
      this.opponentHead.setFlipX(this.opponentPlayer.flipX);
      this.opponentMaskShape.x = this.opponentPlayer.x;
      this.opponentMaskShape.y = this.opponentPlayer.y + yOffset;
    }
    this.myShield.setPosition(this.myPlayer.x, this.myPlayer.y);
    this.opponentShield.setPosition(this.opponentPlayer.x, this.opponentPlayer.y);
  }

  drawStickman(g: Phaser.GameObjects.Graphics, player: Phaser.Physics.Arcade.Sprite, state: string, skill: any, color: number, time: number) {
    g.clear();
    g.lineStyle(6, color, 1);
    
    const x = player.x;
    const y = player.y;
    const dir = player.flipX ? -1 : 1;
    
    let headY = y - 45;
    let pelvisY = y + 10;
    
    if (state === 'attacking' && skill) {
       if (skill.code === 'dashing') {
          // Dashing forward (Lean body)
          g.lineBetween(x, headY + 25, x + dir*15, pelvisY);
          g.lineBetween(x + dir*15, pelvisY, x - dir*20, y + 40);
          g.lineBetween(x + dir*15, pelvisY, x + dir*25, y + 40);
          // Tucked arms
          g.lineBetween(x + dir*5, headY + 30, x - dir*10, headY + 45);
          return;
       } else if (skill.code === 'd_K') { // Leg Sweep (Crouch)
          headY = y - 20;
          pelvisY = y + 25;
          // Torso
          g.lineBetween(x, headY + 25, x, pelvisY);
          // Legs
          g.lineBetween(x, pelvisY, x - dir*10, y + 40); // Back leg
          g.lineBetween(x, pelvisY, x + dir*50, y + 40); // Sweep leg
          // Arms
          g.lineBetween(x, headY + 30, x + dir*20, headY + 40);
          g.lineBetween(x, headY + 30, x - dir*10, headY + 40);
          return;
       } else if (skill.code === 'f_K') { // Flying Kick
          headY = y - 20;
          pelvisY = y - 20;
          // Torso Horizontal
          g.lineBetween(x - dir*20, headY + 25, x, pelvisY);
          // Legs
          g.lineBetween(x, pelvisY, x + dir*50, y); // Flying kick leg
          g.lineBetween(x, pelvisY, x - dir*30, y + 10); // Back leg folded
          // Arms
          g.lineBetween(x - dir*15, headY + 30, x + dir*20, headY + 30);
          return;
       } else if (skill.code === 'd_J') { // Uppercut
          // Torso stretching up
          g.lineBetween(x, headY + 25, x - dir*10, pelvisY);
          // Legs
          g.lineBetween(x - dir*10, pelvisY, x - dir*20, y + 40);
          g.lineBetween(x - dir*10, pelvisY, x + dir*10, y + 40);
          // Arms
          g.lineBetween(x, headY + 30, x + dir*10, headY - 10); // Uppercut arm
          g.lineBetween(x, headY + 30, x - dir*10, headY + 40);
          return;
       } else if (skill.code === 's_f_J') { // Ki Blast (Chưởng)
          // Torso
          g.lineBetween(x, headY + 25, x, pelvisY);
          // Legs (Stanced)
          g.lineBetween(x, pelvisY, x - dir*20, y + 40);
          g.lineBetween(x, pelvisY, x + dir*20, y + 40);
          // Arms (Pushing forward)
          g.lineBetween(x, headY + 30, x + dir*40, headY + 30);
          return;
       }
    }
    
    // Default Torso
    g.lineBetween(x, headY + 25, x, pelvisY);
    
    if (state === 'moving') {
       const swing = Math.sin(time / 50) * 20;
       // Legs
       g.lineBetween(x, pelvisY, x + swing, y + 40);
       g.lineBetween(x, pelvisY, x - swing, y + 40);
       // Arms
       g.lineBetween(x, headY + 30, x - swing, headY + 50);
       g.lineBetween(x, headY + 30, x + swing, headY + 50);
    } else if (state === 'attacking' && skill) {
       // Normal Punch/Kick
       g.lineBetween(x, pelvisY, x - dir*15, y + 40);
       g.lineBetween(x, pelvisY, x + dir*15, y + 40);
       if (skill.code === 'J' || skill.code === 'f_J') {
         g.lineBetween(x, headY + 30, x + dir*40, headY + 30); // Punch
         g.lineBetween(x, headY + 30, x - dir*15, headY + 50);
       } else if (skill.code === 'K') {
         g.lineBetween(x, pelvisY, x + dir*40, headY + 20); // High Kick
       }
    } else if (state === 'crouching') {
       headY = y - 20;
       pelvisY = y + 25;
       g.lineBetween(x, headY + 25, x, pelvisY);
       // Crouched legs
       g.lineBetween(x, pelvisY, x - dir*15, y + 40);
       g.lineBetween(x, pelvisY, x + dir*15, y + 40);
       // Crouched arms
       g.lineBetween(x, headY + 30, x + dir*10, headY + 40); // Guard arm
       g.lineBetween(x, headY + 30, x - dir*5, headY + 40);
    } else { // Idle or Blocking
       g.lineBetween(x, pelvisY, x - 10, y + 40);
       g.lineBetween(x, pelvisY, x + 10, y + 40);
       g.lineBetween(x, headY + 30, x + dir*15, headY + 45); // Guard arm
       g.lineBetween(x, headY + 30, x - dir*10, headY + 40);
    }
  }

  syncFirebase() {
    if (Math.abs(this.myPlayer.x - this.lastSentData.x) > 5 || 
        Math.abs(this.myPlayer.y - this.lastSentData.y) > 5 || 
        this.myPlayer.flipX !== this.lastSentData.flipX ||
        this.myState !== this.lastSentData.state) {
        
        update(ref(database, `rooms/${this.roomId}/players/${this.myId}`), {
          x: Math.round(this.myPlayer.x), y: Math.round(this.myPlayer.y),
          flipX: this.myPlayer.flipX, state: this.myState
        });
        this.lastSentData = { x: this.myPlayer.x, y: this.myPlayer.y, flipX: this.myPlayer.flipX, state: this.myState };
    }
  }

  performAttack(skillData: any) {
    this.isAttacking = true;
    this.myState = 'attacking';
    this.myShield.setAlpha(0);
    
    const flipX = this.myPlayer.flipX;
    
    if (skillData.dash > 0) {
      // 1. Dash phase
      this.myPlayer.setVelocityX(flipX ? -skillData.dash : skillData.dash);
      this.myActiveSkill = { code: 'dashing' };
      
      // 2. Strike phase (after half duration)
      this.time.delayedCall(skillData.duration / 2, () => {
         this.myActiveSkill = skillData;
         this.myPlayer.setVelocityX(0); // Stop sliding
         
         set(ref(database, `rooms/${this.roomId}/attacks/${this.myId}`), {
             ts: Date.now(), flipX: flipX, skillData: skillData
         });
         
         this.showAttackEffect(this.myPlayer, skillData, flipX);
         this.checkHitBoxCollision(skillData, flipX);
      });
      
    } else {
      // Normal attack
      this.myPlayer.setVelocityX(0);
      this.myActiveSkill = skillData;
      
      set(ref(database, `rooms/${this.roomId}/attacks/${this.myId}`), {
          ts: Date.now(), flipX: flipX, skillData: skillData
      });
      
      if (skillData.isProjectile) {
         this.fireProjectile(this.myPlayer, skillData, flipX);
      } else {
         this.showAttackEffect(this.myPlayer, skillData, flipX);
         this.checkHitBoxCollision(skillData, flipX);
      }
    }

    // 3. Reset phase
    this.time.delayedCall(skillData.duration, () => {
      this.isAttacking = false;
      this.myActiveSkill = null;
      this.myState = 'idle';
    });
  }
  
  fireProjectile(player: Phaser.Physics.Arcade.Sprite, skillData: any, flipX: boolean) {
     const proj = this.myProjectiles?.create(player.x + (flipX ? -30 : 30), player.y - 15, 'energy_ball');
     proj.setTint(skillData.color);
     proj.setScale(1.5);
     
     const particles = this.add.particles(0, 0, 'energy_ball', {
        speed: 50, scale: { start: 1, end: 0 }, alpha: { start: 0.5, end: 0 }, blendMode: 'ADD', tint: skillData.color, lifespan: 300
     });
     particles.startFollow(proj);
     
     // Animation glow
     this.tweens.add({ targets: proj, scale: 2.5, yoyo: true, repeat: -1, duration: 150 });
     
     proj.setVelocityX(flipX ? -skillData.projSpeed : skillData.projSpeed);
     proj.body.allowGravity = false;
     
     // Store skillData in projectile for hit detection in update loop
     proj.setData('skillData', skillData);
     proj.setData('particles', particles);
     
     this.time.delayedCall(2000, () => { 
       if (proj.active) {
         proj.destroy();
         particles.destroy();
       }
     }); // Range limit
  }
  
  handleProjectiles() {
     if (!this.myProjectiles) return;
     const opponentRect = new Phaser.Geom.Rectangle(this.opponentPlayer.x - 20, this.opponentPlayer.y - 40, 40, 80);
     
     this.myProjectiles.getChildren().forEach((p: any) => {
         if (p.active) {
            const pRect = new Phaser.Geom.Rectangle(p.x - 15, p.y - 15, 30, 30);
            if (Phaser.Geom.Intersects.RectangleToRectangle(pRect, opponentRect)) {
                this.applyDamageToOpponent(p.getData('skillData'));
                // Explosion effect
                this.showTextEffect(p.x, p.y, 'BOOM!', p.getData('skillData').color);
                
                const parts = p.getData('particles');
                if (parts) parts.destroy();
                p.destroy();
            }
         }
     });
  }

  checkHitBoxCollision(skillData: any, flipX: boolean) {
    const hitBoxRect = new Phaser.Geom.Rectangle(
      flipX ? this.myPlayer.x - skillData.reach : this.myPlayer.x,
      this.myPlayer.y - 20,
      skillData.reach,
      40
    );

    const opponentRect = new Phaser.Geom.Rectangle(
      this.opponentPlayer.x - 20, this.opponentPlayer.y - 40, 40, 80
    );

    if (Phaser.Geom.Intersects.RectangleToRectangle(hitBoxRect, opponentRect)) {
       this.applyDamageToOpponent(skillData);
    }
  }
  
  applyDamageToOpponent(skillData: any) {
       let finalDamage = skillData.damage;
       const isHeavyAttack = skillData.code === 'f_J' || skillData.code === 'f_K'; // L button skills
       
       if (this.opponentState === 'blocking') {
         if (isHeavyAttack) {
             // Guard Break!
             this.showTextEffect(this.opponentPlayer.x, this.opponentPlayer.y - 80, 'GUARD BREAK!', 0xFF8800);
             set(ref(database, `rooms/${this.roomId}/players/${this.opponentId}/stunnedUntil`), Date.now() + 800);
         } else {
             finalDamage = Math.max(1, Math.floor(finalDamage * 0.2));
             this.showTextEffect(this.opponentPlayer.x, this.opponentPlayer.y - 80, 'BLOCKED!', 0xAAAAAA);
         }
       } else {
         this.showTextEffect(this.opponentPlayer.x, this.opponentPlayer.y - 80, `-${finalDamage}`, 0xFF0000);
         if (skillData.stun > 0) {
            set(ref(database, `rooms/${this.roomId}/players/${this.opponentId}/stunnedUntil`), Date.now() + skillData.stun);
         }
       }
       
       get(ref(database, `rooms/${this.roomId}/players/${this.opponentId}/hp`)).then((snap) => {
           let hp = snap.val() || 100;
           hp -= finalDamage;
           set(ref(database, `rooms/${this.roomId}/players/${this.opponentId}/hp`), hp);
       });
  }

  showAttackEffect(player: Phaser.Physics.Arcade.Sprite, skillData: any, flipX: boolean) {
    if (skillData.isProjectile) {
        // Visual only for opponent
        if (player !== this.myPlayer) {
           const proj = this.add.sprite(player.x + (flipX ? -30 : 30), player.y - 15, 'energy_ball');
           proj.setTint(skillData.color);
           proj.setScale(1.5);
           
           const particles = this.add.particles(0, 0, 'energy_ball', {
              speed: 50, scale: { start: 1, end: 0 }, alpha: { start: 0.5, end: 0 }, blendMode: 'ADD', tint: skillData.color, lifespan: 300
           });
           particles.startFollow(proj);
           
           this.tweens.add({ targets: proj, scale: 2.5, yoyo: true, repeat: -1, duration: 150 });
           this.tweens.add({
              targets: proj, x: flipX ? player.x - 800 : player.x + 800,
              duration: 2000, onComplete: () => { proj.destroy(); particles.destroy(); }
           });
        }
        return;
    }
    
    // Melee Hitbox Visual
    const hitbox = this.add.rectangle(
      flipX ? player.x - skillData.reach/2 : player.x + skillData.reach/2,
      player.y, skillData.reach, 20, skillData.color, 0.8
    );
    this.tweens.add({ targets: hitbox, alpha: 0, width: skillData.reach + 20, duration: skillData.duration / 2, onComplete: () => hitbox.destroy() });
    this.tweens.add({ targets: player, x: flipX ? player.x + 10 : player.x - 10, yoyo: true, duration: 100 });
  }
  
  showTextEffect(x: number, y: number, text: string, color: number) {
    const txt = this.add.text(x, y, text, { fontSize: '24px', color: `#${color.toString(16).padStart(6, '0')}`, fontStyle: 'bold' }).setOrigin(0.5);
    this.tweens.add({ targets: txt, y: y - 50, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
  }
}
