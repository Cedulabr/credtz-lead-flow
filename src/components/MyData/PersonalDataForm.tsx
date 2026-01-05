import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import { UserData, PersonType, maritalStatusOptions, pixKeyTypeOptions, brazilianStates } from './types';
import { toast } from 'sonner';

interface PersonalDataFormProps {
  data: UserData | null;
  onSave: (data: Partial<UserData>) => Promise<void>;
  isAdmin?: boolean;
  readOnly?: boolean;
}

export function PersonalDataForm({ data, onSave, isAdmin, readOnly }: PersonalDataFormProps) {
  const [formData, setFormData] = useState<Partial<UserData>>({
    person_type: 'pf',
    full_name: '',
    phone: '',
    personal_email: '',
    pix_key: '',
    pix_key_type: '',
    cpf: '',
    rg: '',
    birth_date: '',
    marital_status: '',
    cnpj: '',
    trade_name: '',
    legal_representative: '',
    legal_representative_cpf: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });
  const [loading, setLoading] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);

  useEffect(() => {
    if (data) {
      setFormData({
        person_type: data.person_type || 'pf',
        full_name: data.full_name || '',
        phone: data.phone || '',
        personal_email: data.personal_email || '',
        pix_key: data.pix_key || '',
        pix_key_type: data.pix_key_type || '',
        cpf: data.cpf || '',
        rg: data.rg || '',
        birth_date: data.birth_date || '',
        marital_status: data.marital_status || '',
        cnpj: data.cnpj || '',
        trade_name: data.trade_name || '',
        legal_representative: data.legal_representative || '',
        legal_representative_cpf: data.legal_representative_cpf || '',
        cep: data.cep || '',
        street: data.street || '',
        number: data.number || '',
        complement: data.complement || '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        state: data.state || '',
      });
    }
  }, [data]);

  const handleChange = (field: keyof UserData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const searchCep = async () => {
    const cep = formData.cep?.replace(/\D/g, '');
    if (!cep || cep.length !== 8) {
      toast.error('CEP inválido');
      return;
    }

    setLoadingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error('CEP não encontrado');
        return;
      }

      setFormData(prev => ({
        ...prev,
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || '',
      }));
      toast.success('Endereço encontrado');
    } catch (error) {
      toast.error('Erro ao buscar CEP');
    } finally {
      setLoadingCep(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      toast.success('Dados salvos com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar dados');
    } finally {
      setLoading(false);
    }
  };

  const formatCpf = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatCnpj = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const formatCep = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{3})\d+?$/, '$1');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tipo de Pessoa */}
      <Card>
        <CardHeader>
          <CardTitle>Tipo de Cadastro</CardTitle>
          <CardDescription>Selecione o tipo de pessoa</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={formData.person_type}
            onValueChange={(value: PersonType) => handleChange('person_type', value)}
            className="flex gap-6"
            disabled={readOnly}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pf" id="pf" disabled={readOnly} />
              <Label htmlFor="pf">Pessoa Física</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="pj" id="pj" disabled={readOnly} />
              <Label htmlFor="pj">Pessoa Jurídica</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Identificação */}
      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
          <CardDescription>Informações básicas de identificação</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="full_name">
              {formData.person_type === 'pf' ? 'Nome Completo' : 'Razão Social'}
            </Label>
            <Input
              id="full_name"
              value={formData.full_name || ''}
              onChange={(e) => handleChange('full_name', e.target.value)}
              placeholder={formData.person_type === 'pf' ? 'Digite seu nome completo' : 'Digite a razão social'}
              disabled={readOnly}
            />
          </div>

          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={(e) => handleChange('phone', formatPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              maxLength={15}
              disabled={readOnly}
            />
          </div>

          <div>
            <Label htmlFor="personal_email">E-mail Pessoal</Label>
            <Input
              id="personal_email"
              type="email"
              value={formData.personal_email || ''}
              onChange={(e) => handleChange('personal_email', e.target.value)}
              placeholder="email@exemplo.com"
              disabled={readOnly}
            />
          </div>

          <div>
            <Label htmlFor="pix_key_type">Tipo de Chave Pix</Label>
            <Select
              value={formData.pix_key_type || ''}
              onValueChange={(value) => handleChange('pix_key_type', value)}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {pixKeyTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="pix_key">Chave Pix</Label>
            <Input
              id="pix_key"
              value={formData.pix_key || ''}
              onChange={(e) => handleChange('pix_key', e.target.value)}
              placeholder="Digite sua chave Pix"
              disabled={readOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dados Específicos */}
      <Card>
        <CardHeader>
          <CardTitle>
            {formData.person_type === 'pf' ? 'Dados Pessoais' : 'Dados Empresariais'}
          </CardTitle>
          <CardDescription>
            {formData.person_type === 'pf' 
              ? 'Informações adicionais de pessoa física' 
              : 'Informações adicionais de pessoa jurídica'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {formData.person_type === 'pf' ? (
            <>
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf || ''}
                  onChange={(e) => handleChange('cpf', formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  disabled={readOnly}
                />
              </div>

              <div>
                <Label htmlFor="rg">RG</Label>
                <Input
                  id="rg"
                  value={formData.rg || ''}
                  onChange={(e) => handleChange('rg', e.target.value)}
                  placeholder="Digite o RG"
                  disabled={readOnly}
                />
              </div>

              <div>
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date || ''}
                  onChange={(e) => handleChange('birth_date', e.target.value)}
                  disabled={readOnly}
                />
              </div>

              <div>
                <Label htmlFor="marital_status">Estado Civil</Label>
                <Select
                  value={formData.marital_status || ''}
                  onValueChange={(value) => handleChange('marital_status', value)}
                  disabled={readOnly}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {maritalStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <>
              <div>
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj || ''}
                  onChange={(e) => handleChange('cnpj', formatCnpj(e.target.value))}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  disabled={readOnly}
                />
              </div>

              <div>
                <Label htmlFor="trade_name">Nome Fantasia</Label>
                <Input
                  id="trade_name"
                  value={formData.trade_name || ''}
                  onChange={(e) => handleChange('trade_name', e.target.value)}
                  placeholder="Nome fantasia da empresa"
                  disabled={readOnly}
                />
              </div>

              <div>
                <Label htmlFor="legal_representative">Responsável Legal</Label>
                <Input
                  id="legal_representative"
                  value={formData.legal_representative || ''}
                  onChange={(e) => handleChange('legal_representative', e.target.value)}
                  placeholder="Nome do responsável"
                  disabled={readOnly}
                />
              </div>

              <div>
                <Label htmlFor="legal_representative_cpf">CPF do Responsável</Label>
                <Input
                  id="legal_representative_cpf"
                  value={formData.legal_representative_cpf || ''}
                  onChange={(e) => handleChange('legal_representative_cpf', formatCpf(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  disabled={readOnly}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
          <CardDescription>Informe seu endereço completo</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                value={formData.cep || ''}
                onChange={(e) => handleChange('cep', formatCep(e.target.value))}
                placeholder="00000-000"
                maxLength={9}
                disabled={readOnly}
              />
            </div>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                className="mt-6"
                onClick={searchCep}
                disabled={loadingCep}
              >
                {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            )}
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="street">Rua</Label>
            <Input
              id="street"
              value={formData.street || ''}
              onChange={(e) => handleChange('street', e.target.value)}
              placeholder="Nome da rua"
              disabled={readOnly}
            />
          </div>

          <div>
            <Label htmlFor="number">Número</Label>
            <Input
              id="number"
              value={formData.number || ''}
              onChange={(e) => handleChange('number', e.target.value)}
              placeholder="Nº"
              disabled={readOnly}
            />
          </div>

          <div>
            <Label htmlFor="complement">Complemento</Label>
            <Input
              id="complement"
              value={formData.complement || ''}
              onChange={(e) => handleChange('complement', e.target.value)}
              placeholder="Apto, Bloco, etc."
              disabled={readOnly}
            />
          </div>

          <div>
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              id="neighborhood"
              value={formData.neighborhood || ''}
              onChange={(e) => handleChange('neighborhood', e.target.value)}
              placeholder="Bairro"
              disabled={readOnly}
            />
          </div>

          <div>
            <Label htmlFor="city">Cidade</Label>
            <Input
              id="city"
              value={formData.city || ''}
              onChange={(e) => handleChange('city', e.target.value)}
              placeholder="Cidade"
              disabled={readOnly}
            />
          </div>

          <div>
            <Label htmlFor="state">Estado</Label>
            <Select
              value={formData.state || ''}
              onValueChange={(value) => handleChange('state', value)}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue placeholder="UF" />
              </SelectTrigger>
              <SelectContent>
                {brazilianStates.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {!readOnly && (
        <div className="flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Dados
          </Button>
        </div>
      )}
    </form>
  );
}
