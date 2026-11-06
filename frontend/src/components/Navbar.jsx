import { motion } from 'framer-motion';
import { Left } from './navbar/Left';
import { Center } from './navbar/Center';
import { Right } from './navbar/Right';

export function Navbar({ onSearchSubmit, onLoginClick, onSelectUpload }) {
  return (
    <header className="relative w-full">
      <Left showBrand={true} onSelectUpload={onSelectUpload} />
      <Center onSearchSubmit={onSearchSubmit} />
      <Right onLoginClick={onLoginClick} />
    </header>
  );
}
export default Navbar;