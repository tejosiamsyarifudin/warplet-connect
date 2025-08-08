import Logo from './assets/logo.svg'
import GameBoard from './game/components/GameBoard'

function App() {
  return (
    <>
      <header className="flex justify-between items-center py-3 px-12 border-b border-primary-500">
        <div className="flex items-center gap-4">
          <img src={Logo} alt="logo" width={56} height={56} />
          <h1 className="text-2xl font-bold">ONET CONNECT</h1>
        </div>
        <nav>
          <ul className="flex gap-3">
            <li><button className="px-4 py-2 bg-green-600 hover:bg-green-500 transition-colors">가입</button></li>
            <li><button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 transition-colors">로그인</button></li>
            <li><button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 transition-colors">테마</button></li>
            <li><button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 transition-colors">언어</button></li>
          </ul>
        </nav>
      </header>

      <main className="h-[85vh] mt-4 mx-12 border border-primary-500 bg-primary-600 p-4 flex justify-between">
        <nav className="w-[10vw]">
          <ul className="flex flex-col gap-2">
            <li><a href="#public-mode" className="hover:text-blue-500 transition-colors">표준 모드</a></li>
            <li><a href="#player-rank" className="hover:text-blue-500 transition-colors">플레이어 순위</a></li>
            <li><a href="#my-profile" className="hover:text-blue-500 transition-colors">내프로필</a></li>
            <li><a href="#chat" className="hover:text-blue-500 transition-colors">채팅</a></li>
            <li><a href="#news" className="hover:text-blue-500 transition-colors">소식</a></li>
          </ul>
        </nav>
        <section className="w-full">
          <GameBoard />
        </section>
      </main>

      <footer className="py-2 px-12 text-right text-sm text-primary-500">
        <p>&copy; 2025 SUHA LEE. All rights reserved.</p>
      </footer>
    </>
  )
}

export default App
