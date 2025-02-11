import { ThemeConfig } from "antd";

const theme: ThemeConfig = {
  token: {
    colorPrimary: "#3080a3",
    fontFamily: "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif",
    //colorLink: "#CD1D8B",
    //colorLinkHover: "#075985",
  },
  components: {
    /* Layout: {
        colorBgHeader: "#342548",
        colorBgFooter: "#342548",
        colorBgBody: "#342548",
      },
      Card: {
        colorBgContainer: "#F6F5F7",
      }, */
    Button: {
      //controlHeightLG: 50,
      //controlHeight: 36,
      //paddingContentHorizontalLG: 100,
      //borderRadiusLG: 40,
      //borderRadius: 8,
      //colorText: "#CD1D8B",
      fontWeight: 500,
    },
    /* Alert: {
        borderRadiusLG: 16,
        colorSuccessBorder: `#E0EFEB`,
        colorSuccessBg: "#E0EFEB",
        paddingContentVerticalSM: 16,
        paddingContentHorizontalLG: 24,
        colorWarningBorder: "transparent",
        fontSize: 18,
      },
      Tag: {
        colorWarningBg: "#FFF5CC",
        colorInfoBg: "#CCF0FC",
        colorError: "white",
        colorErrorBorder: "transparent",
        colorErrorBg: "#CD1D33",
        colorSuccessBorder: "transparent",
        colorSuccess: "black",
        colorSuccessBg: "#E0EFEB",
        colorInfoBorder: "transparent",
        colorInfo: "black",
        colorWarningBorder: "transparent",
        colorWarning: "black",
        fontSizeSM: 16,
        lineHeightSM: 1.5,
        borderRadiusSM: 6,
      },
      Input: {
        colorBorder:
          "background: linear-gradient(0deg, #776E85, #776E85)," +
          "linear-gradient(0deg, #FFFFFF, #FFFFFF);",
      },
      Table: {
        borderRadiusLG: 16,
      },
      Modal: {
        colorPrimaryBg: "#CD1D8B",
      }, */
  },
};

export default theme;
