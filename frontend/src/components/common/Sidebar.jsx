/**
 * Avukat Yönetim Sistemi - Sidebar Component
 * Yan menü navigasyonu
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Gavel as GavelIcon,
  AccountBalance as AccountBalanceIcon,
  TrendingUp as TrendingUpIcon,
  Description as DescriptionIcon,
  CalendarMonth as CalendarIcon,
  Article as ArticleIcon,
  PersonAdd as PersonAddIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Menü öğeleri
 */
const menuItems = [
  { 
    text: 'Dashboard', 
    icon: <DashboardIcon />, 
    path: '/',
    roles: ['admin', 'lawyer', 'secretary', 'intern']
  },
  { 
    text: 'Müvekkiller', 
    icon: <PeopleIcon />, 
    path: '/clients',
    roles: ['admin', 'lawyer', 'secretary', 'intern']
  },
  { 
    text: 'Davalar', 
    icon: <GavelIcon />, 
    path: '/cases',
    roles: ['admin', 'lawyer', 'secretary', 'intern']
  },
  { 
    text: 'Finans', 
    icon: <AccountBalanceIcon />, 
    path: '/finance',
    roles: ['admin', 'lawyer', 'secretary']
  },
  { 
    text: 'Potansiyel İşler', 
    icon: <TrendingUpIcon />, 
    path: '/leads',
    roles: ['admin', 'lawyer', 'secretary']
  },
  { 
    text: 'Belgeler', 
    icon: <DescriptionIcon />, 
    path: '/documents',
    roles: ['admin', 'lawyer', 'secretary', 'intern']
  },
  { 
    text: 'Takvim', 
    icon: <CalendarIcon />, 
    path: '/calendar',
    roles: ['admin', 'lawyer', 'secretary', 'intern']
  },
  { 
    text: 'Şablonlar', 
    icon: <ArticleIcon />, 
    path: '/templates',
    roles: ['admin', 'lawyer', 'secretary']
  }
];

const adminItems = [
  { 
    text: 'Kullanıcılar', 
    icon: <PersonAddIcon />, 
    path: '/users',
    roles: ['admin']
  }
];

const settingsItems = [
  { 
    text: 'Ayarlar', 
    icon: <SettingsIcon />, 
    path: '/settings',
    roles: ['admin', 'lawyer', 'secretary', 'intern']
  }
];

/**
 * Sidebar bileşeni
 */
const Sidebar = ({ drawerWidth, mobileOpen, onDrawerToggle, isMobile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      onDrawerToggle();
    }
  };

  // Kullanıcı rolüne göre menü öğelerini filtrele
  const filterByRole = (items) => {
    return items.filter(item => item.roles.includes(user?.role));
  };

  const drawerContent = (
    <Box sx={{ overflow: 'auto' }}>
      {/* Logo / Başlık */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 64,
          borderBottom: 1,
          borderColor: 'divider'
        }}
      >
        <GavelIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography 
          variant="h6" 
          fontWeight={700}
          sx={{ 
            background: 'linear-gradient(45deg, #1976d2, #9c27b0)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          LawManager
        </Typography>
      </Box>

      {/* Ana menü */}
      <List sx={{ px: 1, py: 2 }}>
        {filterByRole(menuItems).map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText'
                  },
                  '&:hover': {
                    backgroundColor: 'primary.dark'
                  }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {/* Admin menü */}
      {user?.role === 'admin' && (
        <>
          <Divider sx={{ mx: 2 }} />
          <Typography 
            variant="overline" 
            color="text.secondary"
            sx={{ px: 3, pt: 2, display: 'block' }}
          >
            Yönetim
          </Typography>
          <List sx={{ px: 1, pb: 1 }}>
            {filterByRole(adminItems).map((item) => (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  selected={location.pathname === item.path}
                  sx={{
                    borderRadius: 2,
                    '&.Mui-selected': {
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText'
                      },
                      '&:hover': {
                        backgroundColor: 'primary.dark'
                      }
                    }
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}

      {/* Ayarlar */}
      <Divider sx={{ mx: 2 }} />
      <List sx={{ px: 1, py: 1 }}>
        {filterByRole(settingsItems).map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => handleNavigation(item.path)}
              selected={location.pathname === item.path}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '& .MuiListItemIcon-root': {
                    color: 'primary.contrastText'
                  },
                  '&:hover': {
                    backgroundColor: 'primary.dark'
                  }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
    >
      {/* Mobil drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth
          }
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Masaüstü drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            borderRight: 1,
            borderColor: 'divider'
          }
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;
