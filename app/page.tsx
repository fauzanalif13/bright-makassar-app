import Link from 'next/link'
import Image from 'next/image'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      {/* Top Navbar */}
      <header className="fixed top-0 w-full bg-white/90 backdrop-blur-md shadow-sm z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6">
          <div className="flex justify-between items-center h-20">
            {/* Logo area */}
            <div className="flex items-center align-middle space-x-4">
              <Image src="/logo-ybm.png" alt="Logo" width={100} height={100} className="w-[100px] h-auto object-contain" />
              <Image src="/logo-bright.png" alt="Logo" width={100} height={100} className="w-[100px] h-auto object-contain" />
            </div>

            {/* Navigation links & Login Button */}
            <div className="flex items-center space-x-6">
              <nav className="hidden md:flex space-x-8">
                <Link href="https://ybmbrilian.id/" className="text-gray-600 hover:text-blue-600 font-medium transition-colors">
                  Tentang YBM BRILiaN
                </Link>
              </nav>
              {/* <Link
                href="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full font-semibold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                Masuk
              </Link> */}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-grow pt-20">
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-blue-50 min-h-[calc(100vh-5rem)] flex items-center ">

          {/* Decorative shapes */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-100/50 blur-3xl"></div>
            <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-200/30 blur-3xl"></div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-extrabold text-blue-950 mb-6 leading-tight">
                Membangun Generasi <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
                  Cerdas & Berkarakter
                </span>
              </h1>
              <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                Sistem Informasi Terpadu untuk memantau perkembangan Awardee Bright Scholarship YBM BRILiaN RO Makassar.
              </p>

              <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 text-lg"
                >
                  Masuk
                </Link>
                {/* <Link
                  href="#pelajari"
                  className="w-full sm:w-auto px-8 py-4 bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-blue-900 font-semibold rounded-full shadow-sm transition-all text-lg"
                >
                  Pelajari Lebih Lanjut
                </Link> */}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}