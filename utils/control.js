import { camera } from "./constant.js";
import { getProjectionMatrix, invert4, rotate4, translate4 } from "./projection.js";


const resize = (gl, u_focal, projectionMatrix, u_viewport, u_projection, downsample) => {

    gl.uniform2fv(u_focal, new Float32Array([camera.fx, camera.fy]));
    projectionMatrix = getProjectionMatrix(
        camera.fx,
        camera.fy,
        innerWidth,
        innerHeight,
    );

    gl.uniform2fv(u_viewport, new Float32Array([innerWidth, innerHeight]));

    gl.canvas.width = Math.round(innerWidth / downsample);
    gl.canvas.height = Math.round(innerHeight / downsample);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.uniformMatrix4fv(u_projection, false, projectionMatrix);
};

const selectFile = (file) => {
    const fr = new FileReader();
    if (/\.json$/i.test(file.name)) {
        fr.onload = () => {
            cameras = JSON.parse(fr.result);
            viewMatrix = getViewMatrix(cameras[0]);
            projectionMatrix = getProjectionMatrix(
                camera.fx / downsample,
                camera.fy / downsample,
                canvas.width,
                canvas.height,
            );
            gl.uniformMatrix4fv(u_projection, false, projectionMatrix);

            console.log("Loaded Cameras");
        };
        fr.readAsText(file);
    } else {
        stopLoading = true;
        fr.onload = () => {
            splatData = new Uint8Array(fr.result);
            console.log("Loaded", Math.floor(splatData.length / rowLength));

            if (
                splatData[0] == 112 &&
                splatData[1] == 108 &&
                splatData[2] == 121 &&
                splatData[3] == 10
            ) {
                // ply file magic header means it should be handled differently
                worker.postMessage({ ply: splatData.buffer });
            } else {
                worker.postMessage({
                    buffer: splatData.buffer,
                    vertexCount: Math.floor(splatData.length / rowLength),
                });
            }
        };
        fr.readAsArrayBuffer(file);
    }
};



export function initializeEventListeners(canvas: HTMLCanvasElement, gl, u_focal, u_viewport, u_projection, downsample, state) {

    window.addEventListener("keydown", (e) => {
        // if (document.activeElement != document.body) return;
        carousel = false;
        if (!state.activeKeys.includes(e.code)) state.activeKeys.push(e.code);
        if (/\d/.test(e.key)) {
            currentCameraIndex = parseInt(e.key)
            camera = cameras[currentCameraIndex];
            viewMatrix = getViewMatrix(camera);
        }
		if (['-', '_'].includes(e.key)){
			currentCameraIndex = (currentCameraIndex + cameras.length - 1) % cameras.length;
			viewMatrix = getViewMatrix(cameras[currentCameraIndex]);
		}
		if (['+', '='].includes(e.key)){
			currentCameraIndex = (currentCameraIndex + 1) % cameras.length;
			viewMatrix = getViewMatrix(cameras[currentCameraIndex]);
		}
        camid.innerText = "cam  " + currentCameraIndex;
        if (e.code == "KeyV") {
            location.hash =
                "#" +
                JSON.stringify(
                    viewMatrix.map((k) => Math.round(k * 100) / 100),
                );
                camid.innerText =""
        } else if (e.code === "KeyP") {
            carousel = true;
            camid.innerText =""
        }
    });
  
    window.addEventListener("keyup", (e) => {
      state.activeKeys = state.activeKeys.filter((k) => k !== e.code);
    });
  
    window.addEventListener("blur", () => {
      state.activeKeys = [];
    });

    window.addEventListener("resize", () => resize(gl, u_focal, projectionMatrix, u_viewport, u_projection, downsample));
    resize(gl, u_focal, projectionMatrix, u_viewport, u_projection, downsample);
    
    // Mouse wheel event
    window.addEventListener(
        "wheel",
        (e) => {
            carousel = false;
            e.preventDefault();
            const lineHeight = 10;
            const scale =
                e.deltaMode == 1
                    ? lineHeight
                    : e.deltaMode == 2
                    ? innerHeight
                    : 1;
            let inv = invert4(viewMatrix);
            if (e.shiftKey) {
                inv = translate4(
                    inv,
                    (e.deltaX * scale) / innerWidth,
                    (e.deltaY * scale) / innerHeight,
                    0,
                );
            } else if (e.ctrlKey || e.metaKey) {
                // inv = rotate4(inv,  (e.deltaX * scale) / innerWidth,  0, 0, 1);
                // inv = translate4(inv,  0, (e.deltaY * scale) / innerHeight, 0);
                // let preY = inv[13];
                inv = translate4(
                    inv,
                    0,
                    0,
                    (-10 * (e.deltaY * scale)) / innerHeight,
                );
                // inv[13] = preY;
            } else {
                let d = 4;
                inv = translate4(inv, 0, 0, d);
                inv = rotate4(inv, -(e.deltaX * scale) / innerWidth, 0, 1, 0);
                inv = rotate4(inv, (e.deltaY * scale) / innerHeight, 1, 0, 0);
                inv = translate4(inv, 0, 0, -d);
            }

            viewMatrix = invert4(inv);
        },
        { passive: false },
    );
  
    // Mouse events
    let startX, startY, down;
    canvas.addEventListener("mousedown", (e) => {
        carousel = false;
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        down = e.ctrlKey || e.metaKey ? 2 : 1;
    });
  
    canvas.addEventListener("mousemove", (e) => {
        e.preventDefault();
        if (down == 1) {
            let inv = invert4(viewMatrix);
            let dx = (5 * (e.clientX - startX)) / innerWidth;
            let dy = (5 * (e.clientY - startY)) / innerHeight;
            let d = 4;

            inv = translate4(inv, 0, 0, d);
            inv = rotate4(inv, dx, 0, 1, 0);
            inv = rotate4(inv, -dy, 1, 0, 0);
            inv = translate4(inv, 0, 0, -d);
            // let postAngle = Math.atan2(inv[0], inv[10])
            // inv = rotate4(inv, postAngle - preAngle, 0, 0, 1)
            // console.log(postAngle)
            viewMatrix = invert4(inv);

            startX = e.clientX;
            startY = e.clientY;
        } else if (down == 2) {
            let inv = invert4(viewMatrix);
            // inv = rotateY(inv, );
            // let preY = inv[13];
            inv = translate4(
                inv,
                (-10 * (e.clientX - startX)) / innerWidth,
                0,
                (10 * (e.clientY - startY)) / innerHeight,
            );
            // inv[13] = preY;
            viewMatrix = invert4(inv);

            startX = e.clientX;
            startY = e.clientY;
        }
    });
  
    canvas.addEventListener("mouseup", (e) => {
        e.preventDefault();
        down = false;
        startX = 0;
        startY = 0;
    });
  
    let altX = 0,
        altY = 0;
    canvas.addEventListener(
        "touchstart",
        (e) => {
            e.preventDefault();
            if (e.touches.length === 1) {
                carousel = false;
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
                down = 1;
            } else if (e.touches.length === 2) {
                // console.log('beep')
                carousel = false;
                startX = e.touches[0].clientX;
                altX = e.touches[1].clientX;
                startY = e.touches[0].clientY;
                altY = e.touches[1].clientY;
                down = 1;
            }
        },
        { passive: false },
    );
  
    canvas.addEventListener(
        "touchmove",
        (e) => {
            e.preventDefault();
            if (e.touches.length === 1 && down) {
                let inv = invert4(viewMatrix);
                let dx = (4 * (e.touches[0].clientX - startX)) / innerWidth;
                let dy = (4 * (e.touches[0].clientY - startY)) / innerHeight;

                let d = 4;
                inv = translate4(inv, 0, 0, d);
                // inv = translate4(inv,  -x, -y, -z);
                // inv = translate4(inv,  x, y, z);
                inv = rotate4(inv, dx, 0, 1, 0);
                inv = rotate4(inv, -dy, 1, 0, 0);
                inv = translate4(inv, 0, 0, -d);

                viewMatrix = invert4(inv);

                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            } else if (e.touches.length === 2) {
                // alert('beep')
                const dtheta =
                    Math.atan2(startY - altY, startX - altX) -
                    Math.atan2(
                        e.touches[0].clientY - e.touches[1].clientY,
                        e.touches[0].clientX - e.touches[1].clientX,
                    );
                const dscale =
                    Math.hypot(startX - altX, startY - altY) /
                    Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY,
                    );
                const dx =
                    (e.touches[0].clientX +
                        e.touches[1].clientX -
                        (startX + altX)) /
                    2;
                const dy =
                    (e.touches[0].clientY +
                        e.touches[1].clientY -
                        (startY + altY)) /
                    2;
                let inv = invert4(viewMatrix);
                // inv = translate4(inv,  0, 0, d);
                inv = rotate4(inv, dtheta, 0, 0, 1);

                inv = translate4(inv, -dx / innerWidth, -dy / innerHeight, 0);

                // let preY = inv[13];
                inv = translate4(inv, 0, 0, 3 * (1 - dscale));
                // inv[13] = preY;

                viewMatrix = invert4(inv);

                startX = e.touches[0].clientX;
                altX = e.touches[1].clientX;
                startY = e.touches[0].clientY;
                altY = e.touches[1].clientY;
            }
        },
        { passive: false },
    );
  
    canvas.addEventListener(
        "touchend",
        (e) => {
            e.preventDefault();
            down = false;
            startX = 0;
            startY = 0;
        },
        { passive: false },
    );

    // Gamepad events
    window.addEventListener("gamepadconnected", (e) => {
        const gp = navigator.getGamepads()[e.gamepad.index];
        console.log(
            `Gamepad connected at index ${gp.index}: ${gp.id}. It has ${gp.buttons.length} buttons and ${gp.axes.length} axes.`,
        );
    });
  
    window.addEventListener("gamepaddisconnected", (e) => {
      console.log("Gamepad disconnected");
    });

    window.addEventListener("hashchange", (e) => {
        try {
            viewMatrix = JSON.parse(decodeURIComponent(location.hash.slice(1)));
            carousel = false;
        } catch (err) {}
    });

    // Other event listeners (e.g., file drop)
    const preventDefault = (e) => {
      e.preventDefault();
      e.stopPropagation();
    };
  
    document.addEventListener("dragenter", preventDefault);
    document.addEventListener("dragover", preventDefault);
    document.addEventListener("dragleave", preventDefault);
    document.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectFile(e.dataTransfer.files[0]);
    });

    return projectionMatrix, viewMatrix
  }
  