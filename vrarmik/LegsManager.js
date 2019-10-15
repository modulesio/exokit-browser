import {Vector3, Quaternion, Transform, GameObject, MonoBehavior, XRSettings} from './Unity.js';
import PoseManager from './PoseManager.js';

class Leg extends MonoBehavior {
  constructor(...args) {
    super(...args);

    this.upperLeg = new Transform();
    this.upperLeg.localPosition = new Vector3(-0.2, 0, 0);
    this.lowerLeg = new Transform();
    this.lowerLeg.localPosition = new Vector3(0, -0.5, 0);
    this.foot = new Transform();

    this.transform.AddChild(this.upperLeg);
    this.upperLeg.AddChild(this.lowerLeg);
    this.lowerLeg.AddChild(this.foot);

    this.upperLegLength = this.upperLeg.position.distanceTo(this.lowerLeg.position);
    this.lowerLegLength = this.upperLeg.position.distanceTo(this.foot.position);

    this.left = true;

    this.hmdTransformRef = null
  }

  LateUpdate() {
    const hypotenuseDistance = this.upperLegLength;
    const verticalDistance = this.upperLeg.position.distanceTo(this.foot.position) / 2;
    if (verticalDistance < hypotenuseDistance) {
      const footPosition = this.foot.position;
      const footEuler = new THREE.Euler().setFromQuaternion(this.upperLeg.rotation, 'YXZ');
      footEuler.x = 0;
      footEuler.z = 0;
      const footRotation = new Quaternion().setFromEuler(footEuler);
      this.foot.rotation = footRotation;

      const offsetDistance = Math.sqrt(hypotenuseDistance*hypotenuseDistance - verticalDistance*verticalDistance);
      const offsetDirection = this.foot.position.sub(this.upperLeg.position)
        .cross(new Vector3(1, 0, 0).applyQuaternion(this.foot.rotation))
        .normalize();

      this.lowerLeg.position = this.upperLeg.position.add(this.foot.position).divideScalar(2)
        .add(offsetDirection.clone().multiplyScalar(offsetDistance));
      this.lowerLeg.rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), offsetDirection);

      this.foot.position = footPosition;
      this.foot.rotation = footRotation;
    } else {
      const direction = this.foot.position.sub(this.upperLeg.position).normalize();
      this.lowerLeg.position = this.upperLeg.position.add(direction.clone().multiplyScalar(this.upperLegLength));
      this.foot.position = this.lowerLeg.position.add(direction.clone().multiplyScalar(this.lowerLegLength));
    }
	}
}

class LegsManager extends MonoBehavior
{
	constructor(...args) {
    super(...args);

    this.hips = new Transform();
    this.leftLeg = new GameObject().AddComponent(Leg);
    this.hips.AddChild(this.leftLeg.transform);
    this.rightLeg = new GameObject().AddComponent(Leg);
    this.hips.AddChild(this.rightLeg.transform);

    console.log('upper left leg', this.leftLeg.upperLeg.localPosition.toArray().join(','), this.leftLeg.upperLeg.position.toArray().join(','));

    this.rightLeg.upperLeg.localPosition = new Vector3(0.2, 0, 0);
    this.rightLeg.left = false;

    const poseManager = this.GetOrAddComponent(PoseManager);
    this.hmdTransformRef = poseManager.vrTransforms.head;
  }

	Start()
	{
		// XXX
	}

	LateUpdate() {
    this.hips.position = this.hmdTransformRef.position.add(new Vector3(0, -0.6, 0));
    this.hips.rotation = this.hmdTransformRef.rotation;
	}
}

export default LegsManager;