import { IconName } from '../components/types/icon';

export function resolveIconName(iconString: string): IconName {
  const iconMap: Record<string, IconName> = {
    Home: IconName.Home,
    Users: IconName.Users,
    ShoppingCart: IconName.ShoppingCart,
    Truck: IconName.Truck,
    Box: IconName.Box,
    Package: IconName.Package,
    FileText: IconName.FileText,
    Settings: IconName.Settings,
    Bell: IconName.Bell,
    User: IconName.User,
    Lock: IconName.Lock,
    Mail: IconName.Mail,
    Moon: IconName.Moon,
    Sun: IconName.Sun,
    Language: IconName.Language,
    Logout: IconName.Logout,
    Check: IconName.Check,
    X: IconName.X,
    AlertTriangle: IconName.AlertTriangle,
    ArrowLeft: IconName.ArrowLeft,
    ChevronDown: IconName.ChevronDown,
    CaretDownFilled: IconName.CaretDownFilled,
    Menu2: IconName.Menu2,
    Qrcode: IconName.Qrcode,
    FileOff: IconName.FileOff,
  };

  return iconMap[iconString] || IconName.Box;
}
