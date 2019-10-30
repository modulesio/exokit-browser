import {Vector3, Quaternion, Transform} from './Unity.js';

const leftRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI/2);
const rightRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -Math.PI/2);
const bankLeftRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI/2);
const bankRightRotation = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), -Math.PI/2);

	class VRArmIK
	{
		constructor(arm, shoulder, shoulderPoser, target, left) {
			this.arm = arm;
			this.shoulder = shoulder;
			this.shoulderPoser = shoulderPoser;
			this.target = target;
			this.left = left;

			this.upperArmLength = 0;
			this.lowerArmLength = 0;
			this.armLength = 0;
    }

		Start()
		{
			this.upperArmLength = this.arm.lowerArm.position.distanceTo(this.arm.upperArm.position);
			this.lowerArmLength = this.arm.hand.position.distanceTo(this.arm.lowerArm.position);
			this.armLength = this.upperArmLength + this.lowerArmLength;
		}

		Update()
		{
      const handPositionDistance = this.target.position.distanceTo(this.arm.upperArm.position);
      let handPosition;
      // if (handPositionDistance < this.armLength) {
      	handPosition = this.target.position;
      /* } else {
      	handPosition = this.arm.upperArm.position.add(
      		this.target.position.sub(this.arm.upperArm.position).normalize().multiplyScalar(this.armLength)
      	);
      } */

      const shoulderRotation = this.shoulder.transform.rotation;
      const shoulderRotationInverse = shoulderRotation.clone().inverse();

      const hypotenuseDistance = this.upperArmLength;
	    const directDistance = this.arm.upperArm.position.distanceTo(handPosition) / 2;
      const offsetDistance = hypotenuseDistance > directDistance ? Math.sqrt(hypotenuseDistance*hypotenuseDistance - directDistance*directDistance) : 0;
      // console.log('offset distance', this.upperArmLength, this.lowerArmLength, hypotenuseDistance, directDistance, offsetDistance);
      // const outFactor = targetEuler.x < 0 ? (1 - Math.min(Math.max(-targetEuler.x/(Math.PI/4), 0), 1)) : 1;
      const offsetDirection = handPosition.clone().sub(this.arm.upperArm.position).normalize()
        .cross(
        	new Vector3(-1, 0, 0)
        	  .applyQuaternion(shoulderRotation/*.clone().premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (this.left ? 1 : -1) * Math.PI*0.1))*/)
        );

      const localOffsetDirection = offsetDirection.clone().applyQuaternion(shoulderRotationInverse);
      const targetLocalRotation = this.target.rotation.multiply(shoulderRotationInverse).premultiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), Math.PI));
      const targetEuler = new THREE.Euler().setFromQuaternion(
      	targetLocalRotation,
        'XYZ'
      );
      const targetDirection = new Vector3(0, 0, 1).applyQuaternion(targetLocalRotation);
      if (this.left) {
    		const yFactor = Math.min(Math.max((targetEuler.y+Math.PI*0.1)/(Math.PI/2), 0), 1);
    		// const zFactor = Math.min(Math.max((-targetDirection.x + 0.5)/0.25, 0), 1)
    		// const xFactor = Math.min(Math.max((targetDirection.y-0.8)/0.2, 0), 1);
    		// yFactor *= 1-xFactor;
    		// const factor = Math.min(yFactor, 1-xFactor);//Math.min(yFactor, 1-xFactor);
    		targetEuler.z = Math.min(Math.max(targetEuler.z, -Math.PI/2), 0);
    		targetEuler.z = (targetEuler.z * (1 - yFactor)) + (-Math.PI/2 * yFactor);
    		// targetEuler.z *= 1 - xFactor;
    		// targetEuler.z *= 1 - zFactor;
      } else {
      	const yFactor = Math.min(Math.max((-targetEuler.y-Math.PI*0.1)/(Math.PI/2), 0), 1);
    		// const zFactor = Math.min(Math.max((-targetDirection.x + 0.5)/0.25, 0), 1)
    		// const xFactor = Math.min(Math.max((targetDirection.y-0.8)/0.2, 0), 1);
    		// yFactor *= 1-xFactor;
    		// const factor = Math.min(yFactor, 1-xFactor);//Math.min(yFactor, 1-xFactor);
    		targetEuler.z = Math.min(Math.max(targetEuler.z, 0), Math.PI/2);
    		targetEuler.z = (targetEuler.z * (1 - yFactor)) + (Math.PI/2 * yFactor);
    		// targetEuler.z *= 1 - xFactor;
    		// targetEuler.z *= 1 - zFactor;
      }
      localOffsetDirection.applyAxisAngle(new Vector3(0, 0, 1), targetEuler.z);
      offsetDirection.copy(localOffsetDirection).applyQuaternion(this.shoulder.transform.rotation);

      const elbowPosition = this.arm.upperArm.position.add(handPosition).divideScalar(2)
        .add(offsetDirection.clone().multiplyScalar(offsetDistance));

      this.arm.upperArm.rotation = new Quaternion().setFromRotationMatrix(
      	new THREE.Matrix4().lookAt(
	      	new Vector3(),
	      	elbowPosition.clone().sub(this.arm.upperArm.position),
	      	new Vector3(this.left ? -1 : 1, 0, 0).applyQuaternion(shoulderRotation)
	      )
      ).multiply(this.left ? rightRotation : leftRotation);

      // this.arm.lowerArm.position = elbowPosition;
      this.arm.lowerArm.rotation = new Quaternion().setFromRotationMatrix(
      	new THREE.Matrix4().lookAt(
	      	new Vector3(),
	      	handPosition.clone().sub(elbowPosition),
	      	new Vector3(this.left ? -1 : 1, 0, 0).applyQuaternion(shoulderRotation)
	      )
      ).multiply(this.left ? rightRotation : leftRotation);

      // this.arm.hand.position = handPosition;
      this.arm.hand.rotation = this.target.rotation
        .multiply(this.left ? bankRightRotation : bankLeftRotation);
		}
	}

export default VRArmIK;
