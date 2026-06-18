import type {} from '@mui/x-data-grid/themeAugmentation'
import { checkboxClasses } from '@mui/material/Checkbox'
import { outlinedInputClasses } from '@mui/material/OutlinedInput'
import { paperClasses } from '@mui/material/Paper'
import { tablePaginationClasses } from '@mui/material/TablePagination'
import { alpha, createTheme } from '@mui/material/styles'
import { gridClasses } from '@mui/x-data-grid'

const colors = {
  gray50: '#f8f9fa',
  gray100: '#f1f3f5',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#B5B7BA',
  gray500: '#7F7F7F',
  gray700: '#3f3f46',
  gray800: '#2C2C2C',
  gray900: '#171717',
  red50: '#fff1f2',
  red100: '#ffe3e5',
  red500: '#C72028',
  red700: '#8f151b',
}

export const appTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.red500,
      dark: colors.red700,
      light: '#e94a50',
      contrastText: '#ffffff',
    },
    secondary: {
      main: colors.gray500,
      dark: colors.gray800,
      contrastText: '#ffffff',
    },
    background: {
      default: '#f6f7f8',
      paper: '#ffffff',
    },
    text: {
      primary: colors.gray800,
      secondary: colors.gray500,
    },
    divider: alpha(colors.gray400, 0.55),
    error: {
      main: colors.red500,
    },
    action: {
      hover: alpha(colors.gray400, 0.14),
      selected: alpha(colors.red500, 0.08),
      focus: alpha(colors.red500, 0.18),
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h3: {
      fontSize: '1.9rem',
      fontWeight: 650,
      letterSpacing: 0,
      lineHeight: 1.2,
    },
    h4: {
      fontSize: '1.45rem',
      fontWeight: 650,
      letterSpacing: 0,
      lineHeight: 1.35,
    },
    h6: {
      fontWeight: 650,
      letterSpacing: 0,
    },
    subtitle2: {
      fontWeight: 600,
      letterSpacing: 0,
    },
    button: {
      fontWeight: 600,
      letterSpacing: 0,
      textTransform: 'none',
    },
    overline: {
      color: colors.gray500,
      fontSize: '0.72rem',
      fontWeight: 700,
      letterSpacing: '0.08em',
    },
  },
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true,
      },
      styleOverrides: {
        root: ({ theme }) => ({
          transition: 'all 100ms ease-in',
          '&:focus-visible': {
            outline: `3px solid ${alpha(theme.palette.primary.main, 0.38)}`,
            outlineOffset: 2,
          },
        }),
      },
    },
    MuiButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          boxShadow: 'none',
          minHeight: 38,
          '&.MuiButton-containedPrimary': {
            border: `1px solid ${colors.red700}`,
            backgroundColor: colors.red500,
            backgroundImage: `linear-gradient(to bottom, ${colors.red500}, ${colors.red700})`,
            boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.24)}`,
            '&:hover': {
              backgroundColor: colors.red700,
              backgroundImage: 'none',
              boxShadow: 'none',
            },
          },
          '&.MuiButton-outlined': {
            borderColor: colors.gray200,
            backgroundColor: alpha(colors.gray50, 0.65),
            color: colors.gray800,
            '&:hover': {
              borderColor: colors.gray300,
              backgroundColor: colors.gray100,
            },
          },
          '&.MuiButton-text': {
            color: colors.gray700,
            '&:hover': {
              backgroundColor: colors.gray100,
            },
          },
        }),
      },
    },
    MuiCard: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          border: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.background.paper,
          backgroundImage: 'none',
          boxShadow: '0 1px 2px rgba(17, 24, 39, 0.04)',
        }),
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: 0,
          '&:last-child': {
            paddingBottom: 0,
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          backgroundColor: theme.palette.background.paper,
          boxShadow: `inset 0 1px 0 ${alpha('#ffffff', 0.8)}`,
          [`& .${outlinedInputClasses.notchedOutline}`]: {
            borderColor: colors.gray200,
          },
          '&:hover': {
            [`& .${outlinedInputClasses.notchedOutline}`]: {
              borderColor: colors.gray300,
            },
          },
          [`&.${outlinedInputClasses.focused} .${outlinedInputClasses.notchedOutline}`]: {
            borderColor: colors.gray700,
            borderWidth: 1,
          },
        }),
        input: {
          paddingTop: 12,
          paddingBottom: 12,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: ({ theme }) => ({
          marginTop: 4,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
          backgroundImage: 'none',
          boxShadow:
            'hsla(220, 30%, 5%, 0.07) 0px 4px 16px 0px, hsla(220, 25%, 10%, 0.07) 0px 8px 16px -5px',
        }),
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: ({ theme }) => ({
          margin: '2px 4px',
          borderRadius: theme.shape.borderRadius,
          padding: '7px 10px',
        }),
      },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: 999,
          borderColor: theme.palette.divider,
          fontWeight: 600,
        }),
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
          backgroundImage: 'none',
        }),
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: theme.shape.borderRadius,
          boxShadow:
            'hsla(220, 30%, 5%, 0.12) 0px 12px 24px 0px, hsla(220, 25%, 10%, 0.08) 0px 8px 16px -5px',
        }),
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: ({ theme }) => ({
          '--DataGrid-overlayHeight': '300px',
          overflow: 'clip',
          borderColor: theme.palette.divider,
          backgroundColor: theme.palette.background.paper,
          [`& .${gridClasses.columnHeader}`]: {
            backgroundColor: colors.gray50,
          },
          [`& .${gridClasses.footerContainer}`]: {
            backgroundColor: colors.gray50,
          },
          [`& .${checkboxClasses.root}`]: {
            padding: theme.spacing(0.5),
            '& > svg': {
              fontSize: '1rem',
            },
          },
          [`& .${tablePaginationClasses.root}`]: {
            marginRight: theme.spacing(1),
            '& .MuiIconButton-root': {
              maxHeight: 32,
              maxWidth: 32,
            },
          },
        }),
        cell: ({ theme }) => ({
          borderTopColor: theme.palette.divider,
        }),
        row: ({ theme }) => ({
          '&:last-of-type': {
            borderBottom: `1px solid ${theme.palette.divider}`,
          },
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
          },
          '&.Mui-selected': {
            backgroundColor: theme.palette.action.selected,
            '&:hover': {
              backgroundColor: theme.palette.action.hover,
            },
          },
        }),
        menu: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          backgroundImage: 'none',
          [`& .${paperClasses.root}`]: {
            border: `1px solid ${theme.palette.divider}`,
          },
        }),
      },
    },
  },
})
