export const networkCourse = {
	slug: "network-administration-essentials",
	title: "Network Administration Essentials",
	subtitle: "Practical networking for Malaysian Diploma IT students",
	price: "Free",
	duration: "2 weeks",
	lessons: [
		{
			title: "Welcome & your lab setup",
			duration: "8 min",
			description:
				"Set up Cisco Packet Tracer and understand the lab workflow.",
		},
		{
			title: "IP addressing & subnetting",
			duration: "24 min",
			description:
				"Break down subnetting with a repeatable method for lab questions.",
		},
		{
			title: "Build your first LAN",
			duration: "31 min",
			description: "Connect devices, assign addresses, and test your network.",
		},
		{
			title: "VLANs in Packet Tracer",
			duration: "28 min",
			description:
				"Separate departments with VLANs and verify the configuration.",
		},
		{
			title: "Routing fundamentals",
			duration: "35 min",
			description: "Route traffic between networks with static routes.",
		},
	],
};

export const freeCourses = [
	networkCourse,
	{
		slug: "basic-networking",
		title: "Basic Networking",
		subtitle: "Understand how devices, IP addresses, and the internet connect",
		price: "Free",
		duration: "1 week",
		lessons: 4,
	},
	{
		slug: "operating-systems-fundamentals",
		title: "Operating Systems Fundamentals",
		subtitle:
			"Learn the practical foundations of Windows, Linux, and system processes",
		price: "Free",
		duration: "1 week",
		lessons: 4,
	},
];
