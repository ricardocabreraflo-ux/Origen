import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

export const FRAUNCES = "Fraunces";
export const ARCHIVO = "Archivo";

loadFont({ family: FRAUNCES, url: staticFile("fonts/Fraunces-Light.ttf"), weight: "300" });
loadFont({ family: FRAUNCES, url: staticFile("fonts/Fraunces-Regular.ttf"), weight: "400" });
loadFont({ family: FRAUNCES, url: staticFile("fonts/Fraunces-SemiBold.ttf"), weight: "600" });
loadFont({ family: FRAUNCES, url: staticFile("fonts/Fraunces-Bold.ttf"), weight: "700" });
loadFont({
  family: FRAUNCES,
  url: staticFile("fonts/Fraunces-Italic.ttf"),
  weight: "400",
  style: "italic",
});

loadFont({ family: ARCHIVO, url: staticFile("fonts/Archivo-Regular.ttf"), weight: "400" });
loadFont({ family: ARCHIVO, url: staticFile("fonts/Archivo-SemiBold.ttf"), weight: "600" });
loadFont({ family: ARCHIVO, url: staticFile("fonts/Archivo-Bold.ttf"), weight: "700" });
