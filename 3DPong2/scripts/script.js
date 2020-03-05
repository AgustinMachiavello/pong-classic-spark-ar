const Diagnostics = require('Diagnostics')
const Scene = require('Scene');
const Patches = require('Patches');
const DeviceMotion = require('DeviceMotion');
const Time  = require('Time')


const deviceRotation = DeviceMotion.worldTransform
const Z = deviceRotation.rotationZ
const borderRight = Scene.root.find('borderRight')
const borderLeft = Scene.root.find('borderLeft')
const goalPlayerCtrl= Scene.root.find('goalPlayerCtrl')
const goalEnemyCtrl= Scene.root.find('goalEnemyCtrl')

// GAME START
const gameStarted = Patches.getBooleanValue('gameStarted')

// SCORE
var playerScore = 0
var enemyScore = 0

// PADDLE POSITION
const paddleCtrlX = Patches.getScalarValue('paddleCtrlX')
const enemyPaddleCtrlX = Patches.getScalarValue('enemyPaddleCtrlX')

// BALL POSITION
const ballPosition = {x:0, z:0}
const ballSpeed = {x:0.01, z:0.02}
var ballSpeedOrientationZ = 1 // -1 equals UP (opposite to player) and 1 equals DOWN (to the player)
ballSpeedOrientationZ = getRndInteger(-1, 1)
if (ballSpeedOrientationZ === 0){
  ballSpeedOrientationZ = 1
}
var ballSpeedOrientationX = 0 // 1 equals to the right side of the player while -1 means to the left of the player or 0
ballSpeedOrientationX =  getRndInteger(-1, 1)

// TOLERANCES
const toleranceX = 0.1 // Player paddle
var toleranceZ = 0.03
const toleranceBorderX = 0.05
const toleranceBorderZ = 10
const toleranceGoalX = 10
const toleranceGoalZ = 0.02
const toleranceDiffX = 0.01 // paddle-ball X position tolerance for ball X speed

// SENDING INFO
Patches.setScalarValue('device_rotation_Z', deviceRotation.rotationZ)

// DIAGNOSTICS
//Diagnostics.watch("rotation device Z:", deviceRotation.rotationZ)

Time.setInterval(update, 20);

var step = 0


function update(){
  step += 1
  if (gameStarted.pinLastValue() === false || step < 40){
    return
  }
  var posX = parseFloat(paddleCtrlX.pinLastValue())

  // PLAYER
  if (checkCollition(posX, 0.5)){
    ballSpeedOrientationZ = -1
    increaseBallSpeed()
    calculateBallSpeedX(posX)
    Patches.setBooleanValue('hit1', true)
  }
  else {
    Patches.setBooleanValue('hit1', false)
  }

  // ENEMY
  if (checkCollition(enemyPaddleCtrlX.pinLastValue(), -0.5)){
    ballSpeedOrientationZ = 1
    increaseBallSpeed()
    calculateBallSpeedX(enemyPaddleCtrlX.pinLastValue())
    Patches.setBooleanValue('hit2', true)
  }
  else {
    Patches.setBooleanValue('hit2', false)
  }
  
  // BORDERS
  if (checkCollitionBorders(borderRight.transform.x.pinLastValue(), borderRight.transform.z.pinLastValue())){ // RIGHT BORDER
    ballSpeedOrientationX = -1
    Patches.setBooleanValue('hitWall', true)
  }
  else if (checkCollitionBorders(borderLeft.transform.x.pinLastValue(), borderLeft.transform.z.pinLastValue())){ // LEFT BORDER
    ballSpeedOrientationX = 1
    Patches.setBooleanValue('hitWall', true)
  }
  else {
    Patches.setBooleanValue('hitWall', false)
  }

  // GOALS
  if (checkCollitionGoals(goalPlayerCtrl.transform.x.pinLastValue(), goalPlayerCtrl.transform.z.pinLastValue())){
    enemyScore += 1
    Patches.setBooleanValue('goalAlert', true)
    resetGame()
    step = 0
  }
  else if (checkCollitionGoals(goalEnemyCtrl.transform.x.pinLastValue(), goalEnemyCtrl.transform.z.pinLastValue())){
    playerScore += 1
    Patches.setBooleanValue('goalAlert', true)
    resetGame()
    step = 0
  }
  else {
    Patches.setBooleanValue('goalAlert', false)
  }

  ballPosition.z += ballSpeed.z*ballSpeedOrientationZ
  ballPosition.x += ballSpeed.x*ballSpeedOrientationX

  // SENDING INFO
  Patches.setScalarValue('enemyPaddleCtrlXFrom', ballPosition.x)
  Patches.setScalarValue('ball_position_X', ballPosition.x)
  Patches.setScalarValue('ball_position_Z', ballPosition.z)
  Patches.setScalarValue('playerScore', playerScore)
  Patches.setScalarValue('enemyScore', enemyScore)

}

function checkCollition(posX, posZ){
  // Checks if the ball has collitioned with the given position
  if (posX - toleranceX <= ballPosition.x && ballPosition.x <= posX + toleranceX && posZ - 0.01 <= ballPosition.z && ballPosition.z <= posZ + toleranceZ){ // Collition
    return true
  }
  return false
}

function checkCollitionBorders(posX, posZ){
  // Checks if the ball has collitioned with the border
  if (posX - toleranceBorderX <= ballPosition.x && ballPosition.x <= posX + toleranceBorderX && posZ - toleranceBorderZ <= ballPosition.z && ballPosition.z <= posZ + toleranceBorderZ){
    return true
  }
  return false
}

function checkCollitionGoals(posX, posZ){
  // Checks if the ball has collitioned with the border
  //  if (posX - toleranceGoalX <= ballPosition.x && ballPosition.x <= posX + toleranceGoalX && posZ - toleranceGoalZ <= ballPosition.z && ballPosition.z <= posZ + toleranceGoalZ){
  if (posX - toleranceGoalX <= ballPosition.x && ballPosition.x <= posX + toleranceGoalX && posZ - toleranceGoalZ <= ballPosition.z && ballPosition.z <= posZ + toleranceGoalZ){
    
    return true
  }
  return false
}

function calculateBallSpeedX(posX){
  // Calcualtes the ball speed depending on how far of the paddle edge it hits (further is more speed)
  if (ballSpeed.x >= 0.02){
    return
  }
  const differenceX = posX - ballPosition.x
  if (0 - toleranceDiffX <= differenceX && differenceX <= 0 + toleranceDiffX){
    ballSpeedOrientationX = 0
  }
  else if (differenceX <= (0 - toleranceDiffX)){ // Right side hit
    if (ballSpeedOrientationX === 1){
      ballSpeedOrientationX = 1
    }
    else {
      ballSpeedOrientationX = -1
    }
    ballSpeed.x += 0.002
  }
  else if (differenceX >= (0 + toleranceDiffX)){ // Left side hit
    if (ballSpeedOrientationX === 1){
      ballSpeedOrientationX = 1
    }
    else {
      ballSpeedOrientationX = -1
    }
    ballSpeed.x += 0.002
  }

}

function increaseBallSpeed(){
  if (ballSpeed.z >= 0.04){
    return
  }
  else {
    var i = getRndInteger(0, 1)
    if (i===0){
      ballSpeed.z = ballSpeed.z + 0.003
    } else {
      ballSpeed.z = ballSpeed.z - 0.001
    }
  }
}

function resetGame(){

  ballPosition.x = 0
  ballPosition.z = 0
  ballSpeed.x = 0.01
  ballSpeed.z = 0.02
  ballSpeedOrientationZ = getRndInteger(-1, 1)
  if (ballSpeedOrientationZ === 0){
    ballSpeedOrientationZ = -1
  }
  ballSpeedOrientationX = getRndInteger(-1, 1)
}

function getRndInteger(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}