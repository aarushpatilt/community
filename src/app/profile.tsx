import Image from "next/image";

// this is the profile page of the application

export default function Profile() {
    return ( 
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
            <Image
                src="/profile.jpg"
                alt="Profile Picture"
                width={150}
                height={150}
                className="rounded-full mb-4"
            />
            <h1 className="text-3xl font-bold">John Doe</h1>
            <p className="text-gray-400">Web Developer</p>
            <p className="text-gray-500 mt-2">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
        </div>
    );
}
