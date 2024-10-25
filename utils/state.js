
// This class state is used to passing around different modules to make 
export default class State {
    constructor() {
        this.viewMatrix = null;
        this.projectionMatrix = null;
        this.carousel = true;
        this.activeKeys = [];
        this.currentCameraIndex = 0;
    }

}