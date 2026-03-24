import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bolt as BoltIcon, Nature as NatureIcon } from '@mui/icons-material';

const Footer = () => {
  const location = useLocation();
  
  // Don't show footer on login page
  if (location.pathname === '/login') return null;

  return (
    <footer className="bg-white border-t border-[#E5E7EB] py-5 px-5 md:px-12 flex flex-col md:flex-row justify-between items-center text-[13px] text-[#555] gap-4">
      <div className="flex items-center gap-2">
        <BoltIcon className="text-[#EAB308] !text-[18px]" />
        <span>© 2026 EV Saarthi — In association with <strong className="text-[#16A34A] font-bold">ReUrja</strong></span>
      </div>
      
      <div className="flex items-center gap-1.5 text-[#888]">
        Free Forever <NatureIcon className="text-[#16A34A] !text-[16px]" />
      </div>
    </footer>
  );
};

export default Footer;
