import React from 'react';
import { Image } from 'react-native';

const HOME_ICON     = require('../assets/tab-home-unified-v2-nobg.webp');
const STATUS_ICON   = require('../assets/tab-status-unified-v2-nobg.webp');
const CHEF_ICON     = require('../assets/tab-chef-unified-v2-nobg.webp');
const RECORD_ICON   = require('../assets/tab-camera-unified-v2-nobg.webp');
const PERSON_ICON   = require('../assets/tab-person-unified-v2-nobg.webp');
const CALENDAR_ICON = require('../assets/tab-calendar-unified-nobg.webp');

interface Props { color?: string; size?: number }

export const HomeIcon     = ({ size = 22 }: Props) => <Image source={HOME_ICON}     style={{ width: size, height: size }} resizeMode="contain" />;
export const StatusIcon   = ({ size = 22 }: Props) => <Image source={STATUS_ICON}   style={{ width: size, height: size }} resizeMode="contain" />;
export const ChefIcon     = ({ size = 22 }: Props) => <Image source={CHEF_ICON}     style={{ width: size, height: size }} resizeMode="contain" />;
export const RecordIcon   = ({ size = 22 }: Props) => <Image source={RECORD_ICON}   style={{ width: size, height: size }} resizeMode="contain" />;
export const PersonIcon   = ({ size = 22 }: Props) => <Image source={PERSON_ICON}   style={{ width: size, height: size }} resizeMode="contain" />;
export const CalendarIcon = ({ size = 22 }: Props) => <Image source={CALENDAR_ICON} style={{ width: size, height: size }} resizeMode="contain" />;
