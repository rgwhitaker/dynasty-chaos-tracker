import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

/**
 * Hook to detect mobile and tablet breakpoints.
 * - isMobile: true when viewport < sm (600px)
 * - isTablet: true when viewport < md (900px) but >= sm
 * - isSmallScreen: true when viewport < md (900px)
 */
const useMobileDetect = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  return { isMobile, isSmallScreen };
};

export default useMobileDetect;
