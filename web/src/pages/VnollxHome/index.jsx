import React from 'react';
import { ArrowRight, Code, CheckCircle, Terminal, Cpu, Globe, Star, Users, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VnollxHome() {
    return (
        <div className="min-h-screen bg-white text-gray-900 overflow-x-hidden font-sans selection:bg-blue-100">
            {/* Navbar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                            <Code size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight text-gray-900">Vnollx</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
                        <Link to="#" className="hover:text-blue-600 transition-colors">题库</Link>
                        <Link to="#" className="hover:text-blue-600 transition-colors">竞赛</Link>
                        <Link to="#" className="hover:text-blue-600 transition-colors">讨论</Link>
                        <Link to="/horror" className="hover:text-red-600 transition-colors">彩蛋</Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="text-sm font-medium text-gray-600 hover:text-blue-600 transition-colors">登录</button>
                        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm hover:shadow-md">注册</button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <main className="pt-32 pb-20 relative">
                {/* Background Effects */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-100 rounded-full blur-[128px] opacity-60" />
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-100 rounded-full blur-[128px] opacity-60" />
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                                Vnollx 在线编程平台全新上线
                            </div>
                            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-6 tracking-tight text-gray-900">
                                掌握代码 <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  改变世界
                </span>
                            </h1>
                            <p className="text-lg text-gray-600 mb-8 max-w-xl leading-relaxed">
                                Vnollx 提供海量编程题目、实时评测系统和活跃的技术社区。无论你是初学者还是算法大神，这里都是你提升技能的最佳场所。
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-medium transition-all hover:scale-105 shadow-lg shadow-blue-600/20">
                                    开始刷题 <ArrowRight size={18} />
                                </button>
                                <button className="px-8 py-4 rounded-lg font-medium border border-gray-200 hover:bg-gray-50 text-gray-700 transition-colors">
                                    查看题库
                                </button>
                            </div>

                            <div className="mt-12 flex items-center gap-8 text-gray-500 text-sm">
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={16} className="text-blue-600" />
                                    <span>支持 20+ 编程语言</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle size={16} className="text-blue-600" />
                                    <span>实时评测反馈</span>
                                </div>
                            </div>
                        </div>

                        <div className="relative">
                            {/* Abstract Code Visual */}
                            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-2xl shadow-gray-200 relative overflow-hidden group hover:border-blue-500/30 transition-colors duration-500">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                                <div className="flex gap-2 mb-4">
                                    <div className="w-3 h-3 rounded-full bg-red-500" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                                    <div className="w-3 h-3 rounded-full bg-green-500" />
                                </div>
                                <div className="space-y-3 font-mono text-sm">
                                    <div className="flex gap-4">
                                        <span className="text-gray-500 select-none">01</span>
                                        <span className="text-purple-400">class</span> <span className="text-yellow-200">Solution</span> <span className="text-gray-300">{`{`}</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="text-gray-500 select-none">02</span>
                                        <span className="text-gray-300 pl-4">public int maxArea(int[] height) {`{`}</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="text-gray-500 select-none">03</span>
                                        <span className="text-gray-300 pl-8">int left = 0, right = height.length - 1;</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="text-gray-500 select-none">04</span>
                                        <span className="text-gray-300 pl-8">int maxArea = 0;</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="text-gray-500 select-none">05</span>
                                        <span className="text-gray-300 pl-8">{'while (left < right) {'}</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="text-gray-500 select-none">06</span>
                                        <span className="text-gray-500 pl-12">// Your logic here...</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="text-gray-500 select-none">07</span>
                                        <span className="text-blue-400 pl-12">return</span> <span className="text-gray-300">maxArea;</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="text-gray-500 select-none">08</span>
                                        <span className="text-gray-300 pl-8">{`}`}</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <span className="text-gray-500 select-none">09</span>
                                        <span className="text-gray-300">{`}`}</span>
                                    </div>
                                </div>

                                {/* Floating Badge */}
                                <div className="absolute bottom-6 right-6 bg-green-900/30 border border-green-500/30 text-green-400 px-4 py-2 rounded-full text-xs font-mono flex items-center gap-2 animate-pulse">
                                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                                    Accepted (0ms)
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Stats Section */}
            <section className="py-20 border-t border-gray-100 bg-gray-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-4xl font-bold text-gray-900 mb-2">2000+</div>
                            <div className="text-gray-500 text-sm">精选题目</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-gray-900 mb-2">50万+</div>
                            <div className="text-gray-500 text-sm">注册用户</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-gray-900 mb-2">1000万+</div>
                            <div className="text-gray-500 text-sm">代码提交</div>
                        </div>
                        <div>
                            <div className="text-4xl font-bold text-gray-900 mb-2">99.9%</div>
                            <div className="text-gray-500 text-sm">服务可用性</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">为什么选择 Vnollx？</h2>
                        <p className="text-gray-600 max-w-2xl mx-auto">
                            我们致力于提供最优质的编程学习体验，帮助你快速掌握算法与数据结构。
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-12">
                        {/* Feature 1 */}
                        <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow duration-300 group">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600 group-hover:scale-110 transition-transform">
                                <Terminal size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">在线代码编辑器</h3>
                            <p className="text-gray-600 leading-relaxed">
                                支持 20+ 种编程语言，智能代码补全，实时语法检查，让你专注于逻辑实现。
                            </p>
                        </div>
                        {/* Feature 2 */}
                        <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow duration-300 group">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 text-purple-600 group-hover:scale-110 transition-transform">
                                <Cpu size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">极速评测引擎</h3>
                            <p className="text-gray-600 leading-relaxed">
                                分布式评测集群，毫秒级反馈。支持特判（Special Judge）和交互式题目。
                            </p>
                        </div>
                        {/* Feature 3 */}
                        <div className="p-8 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-xl transition-shadow duration-300 group">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6 text-green-600 group-hover:scale-110 transition-transform">
                                <Globe size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">全球技术社区</h3>
                            <p className="text-gray-600 leading-relaxed">
                                与全球百万开发者交流解题思路，分享面试经验，参与周赛赢取丰厚奖品。
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-blue-600 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                    <h2 className="text-4xl font-bold text-white mb-6">准备好迎接挑战了吗？</h2>
                    <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">
                        加入 Vnollx，开启你的编程进阶之旅。现在注册，即可免费获取《算法面试通关手册》。
                    </p>
                    <button className="bg-white text-blue-600 px-10 py-4 rounded-full font-bold text-lg hover:bg-blue-50 transition-colors shadow-2xl shadow-blue-900/20 hover:scale-105 transform duration-200">
                        立即免费注册
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 py-16">
                <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-12 mb-12">
                    <div>
                        <div className="flex items-center gap-2 mb-6">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <Code size={20} className="text-white" />
                            </div>
                            <span className="text-xl font-bold text-white">Vnollx</span>
                        </div>
                        <p className="text-sm leading-relaxed">
                            Vnollx 是全球领先的在线编程学习平台，致力于帮助开发者提升技术能力，通过算法改变世界。
                        </p>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-6">平台</h4>
                        <ul className="space-y-4 text-sm">
                            <li><a href="#" className="hover:text-white transition-colors">题库</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">竞赛</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">求职</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">会员</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-6">资源</h4>
                        <ul className="space-y-4 text-sm">
                            <li><a href="#" className="hover:text-white transition-colors">帮助中心</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">API 文档</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">社区规范</a></li>
                            <li><a href="#" className="hover:text-white transition-colors">开源贡献</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-white font-bold mb-6">关注我们</h4>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors cursor-pointer">
                                <Globe size={18} />
                            </div>
                            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors cursor-pointer">
                                <Users size={18} />
                            </div>
                            <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-blue-600 hover:text-white transition-colors cursor-pointer">
                                <Star size={18} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-gray-800 text-center text-sm">
                    <p>&copy; 2025 Vnollx Inc. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
