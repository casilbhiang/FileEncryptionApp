import { useState } from 'react';
import { Lock, Mail, HelpCircle } from 'lucide-react';

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
    {children}
  </div>
);

const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="text-center px-8 pt-8 pb-6">
    {children}
  </div>
);

const CardContent = ({ children }: { children: React.ReactNode }) => (
  <div className="px-8 pb-8">
    {children}
  </div>
);

const CardFooter = ({ children }: { children: React.ReactNode }) => (
  <div className="px-8 py-6 border-t border-gray-200 bg-gray-50">
    {children}
  </div>
);

const IconCircle = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-gray-100 rounded-full mb-4">
    {children}
  </div>
);

const Title = ({ children }: { children: React.ReactNode }) => (
  <h1 className="text-3xl font-bold text-gray-800 mb-2">
    {children}
  </h1>
);

const Subtitle = ({ children }: { children: React.ReactNode }) => (
  <p className="text-gray-500 text-sm">
    {children}
  </p>
);

const InputGroup = ({ children }: { children: React.ReactNode }) => (
  <div className="mb-5">
    {children}
  </div>
);

const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) => (
  <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 mb-2">
    {children}
  </label>
);

const Input = ({ 
  id, 
  type, 
  value, 
  onChange, 
  placeholder,
  icon: Icon
}: { 
  id: string;
  type: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon: React.ElementType;
}) => (
  <div className="relative">
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Icon className="h-5 w-5 text-gray-400" />
    </div>
    <input
      id={id}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required
      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-800 placeholder-gray-400 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
    />
  </div>
);

const Button = ({ 
  children, 
  onClick, 
  variant = 'primary' 
}: { 
  children: React.ReactNode; 
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}) => {
  const baseClasses = "w-full font-semibold py-3 rounded-lg transition-all duration-200";
  const variantClasses = variant === 'primary'
    ? "bg-gradient-to-r from-purple-800 to-violet-900 hover:from-purple-900 hover:to-violet-950 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:scale-98"
    : "flex items-center justify-center gap-2 text-gray-600 hover:text-purple-600 group";
  
  return (
    <button onClick={onClick} className={`${baseClasses} ${variantClasses}`}>
      {children}
    </button>
  );
};

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    console.log('Login attempted:', { email, password });
    // Add your login logic here
  };

  const handleHelp = () => {
    alert('Please contact your clinic administrator for assistance.');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 via-purple-50 to-gray-100 p-4 sm:p-6">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader>
            <IconCircle>
              <Lock className="w-8 h-8 text-purple-600" />
            </IconCircle>
            <Title>Welcome Back</Title>
            <Subtitle>Secure File Encryption Portal</Subtitle>
          </CardHeader>

          <CardContent>
            <InputGroup>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                icon={Mail}
              />
            </InputGroup>

            <InputGroup>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                icon={Lock}
              />
            </InputGroup>

            <Button onClick={handleLogin} variant="primary">
              Login
            </Button>
          </CardContent>

          <CardFooter>
            <Button onClick={handleHelp} variant="secondary">
              <HelpCircle className="w-5 h-5 group-hover:text-purple-600 transition-colors" />
              <span className="text-sm font-medium">
                Need Help? Contact Clinic Admin
              </span>
            </Button>
          </CardFooter>
        </Card>

        <p className="text-center mt-6 text-sm text-gray-500">
          🔒 Your files are encrypted end-to-end
        </p>
      </div>
    </div>
  );
}