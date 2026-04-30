import {Composition} from "remotion";
import {LangLaunchVideo} from "./LangLaunchVideo";

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="LangAppPreview69"
        component={LangLaunchVideo}
        durationInFrames={720}
        fps={30}
        width={886}
        height={1920}
        defaultProps={{
          title: "Lang",
        }}
      />
    </>
  );
};
