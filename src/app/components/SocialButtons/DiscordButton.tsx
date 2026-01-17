import {Button, ButtonProps} from '@mantine/core';

import { DiscordIcon } from '@mantinex/dev-icons';
import classes from './SocialButton.module.scss';

export function DiscordButton(props: ButtonProps & React.ComponentPropsWithoutRef<'button'>) {
    return <Button className={classes.discordButton} leftSection={<DiscordIcon size={16} />} {...props} />;
}