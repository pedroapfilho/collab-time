import { Text } from "react-email";

import { APP_NAME } from "../brand";

type BrandLogoProps = {
  height?: number;
};

/** The nav wordmark: hollow square mark plus the name in the display weight. */
const BrandLogo = ({ height = 26 }: BrandLogoProps) => {
  return (
    <Text
      className="m-0 inline-block align-middle font-sans text-[1.125rem] font-semibold tracking-tight text-primary-foreground no-underline"
      style={{ lineHeight: `${height}px` }}
    >
      <span
        className="mr-3 inline-block h-3 w-3 border-2 border-solid border-primary-foreground align-middle"
        style={{ marginTop: -2 }}
      />
      {APP_NAME}
    </Text>
  );
};

export { BrandLogo };
