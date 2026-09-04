-- Custom SQL migration file, put your code below! --
INSERT INTO `course` (`id`, `slug`, `title`, `description`, `priceSen`, `duration`, `createdAt`) VALUES
	('basic-networking', 'basic-networking', 'Basic Networking', 'Understand how devices, IP addresses, and the internet connect', 0, '1 week', 0),
	('operating-systems-fundamentals', 'operating-systems-fundamentals', 'Operating Systems Fundamentals', 'Learn the practical foundations of Windows, Linux, and system processes', 0, '1 week', 0);
--> statement-breakpoint
INSERT INTO `lesson` (`id`, `courseId`, `position`, `title`, `description`, `duration`, `createdAt`) VALUES
	('basic-networking-devices', 'basic-networking', 1, 'Network devices explained', 'Understand the job of switches, routers, access points, and firewalls.', '14 min', 0),
	('basic-networking-ip-addresses', 'basic-networking', 2, 'IP addresses and local networks', 'Learn how devices identify each other and communicate on a LAN.', '19 min', 0),
	('basic-networking-dns', 'basic-networking', 3, 'DNS, DHCP, and the internet', 'Follow what happens when you connect to Wi-Fi and open a website.', '22 min', 0),
	('basic-networking-troubleshooting', 'basic-networking', 4, 'First troubleshooting steps', 'Use a practical checklist to diagnose common connection issues.', '18 min', 0),
	('os-fundamentals-intro', 'operating-systems-fundamentals', 1, 'What an operating system does', 'Understand how an OS manages hardware, files, processes, and users.', '16 min', 0),
	('os-fundamentals-files', 'operating-systems-fundamentals', 2, 'Files, folders, and permissions', 'Work with file systems and understand why access permissions matter.', '21 min', 0),
	('os-fundamentals-processes', 'operating-systems-fundamentals', 3, 'Processes and memory', 'See how programs run and how the OS shares memory and CPU time.', '20 min', 0),
	('os-fundamentals-command-line', 'operating-systems-fundamentals', 4, 'Command line essentials', 'Build confidence with the terminal on Windows and Linux.', '25 min', 0);
