'use client';

import Image from 'next/image';
import { Plus, Sparkles } from 'lucide-react';
import { COMPANIES } from '@/data/company-problems';
import { useInterviewStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CompanySelectorProps {
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string) => void;
}

export function CompanySelector({ selectedCompanyId, onSelectCompany }: CompanySelectorProps) {
  const { customProblems } = useInterviewStore();

  // Separate NeetCode 150 from other companies
  const neetcode = COMPANIES.find(c => c.id === 'neetcode-150');
  const otherCompanies = COMPANIES.filter(c => c.id !== 'neetcode-150');

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Select a Category</h2>
        <p className="text-muted-foreground">
          Practice with curated problems or interview questions from top tech companies
        </p>
      </div>

      {/* Featured: NeetCode 150 */}
      {neetcode && (
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium text-muted-foreground">Featured Collection</span>
          </div>
          <Card
            className={cn(
              'cursor-pointer transition-all hover:shadow-xl',
              'bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20',
              'border-orange-200/50 dark:border-orange-800/30',
              selectedCompanyId === neetcode.id && 'ring-2 ring-orange-500 shadow-lg'
            )}
            onClick={() => onSelectCompany(neetcode.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${neetcode.color}30` }}
                  >
                    <Image
                      src={neetcode.logo}
                      alt="NeetCode logo"
                      width={40}
                      height={40}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      {neetcode.name}
                      <Badge className="bg-orange-500 text-white hover:bg-orange-600">
                        150 Problems
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {neetcode.description}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {['Arrays', 'Trees', 'Graphs', 'DP', 'Backtracking', 'Greedy', '+12 categories'].map(tag => (
                  <Badge key={tag} variant="outline" className="text-xs bg-white/50 dark:bg-black/20">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Custom Problems Card */}
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Custom Problems */}
          <Card
            className={cn(
              'cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-dashed border-2',
              selectedCompanyId === 'custom' && 'ring-2 ring-primary shadow-lg border-solid'
            )}
            onClick={() => onSelectCompany('custom')}
          >
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30">
                <Plus className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-xl">Custom Problems</CardTitle>
              <CardDescription className="text-sm">
                Import from LeetCode or add your own
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex justify-center gap-2 text-xs text-muted-foreground">
                <span className="bg-secondary px-2 py-1 rounded">
                  {customProblems.length} saved
                </span>
                <span className="bg-secondary px-2 py-1 rounded">
                  + Add new
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Other Companies */}
          {otherCompanies.map((company) => (
            <Card
              key={company.id}
              className={cn(
                'cursor-pointer transition-all hover:scale-105 hover:shadow-lg',
                selectedCompanyId === company.id
                  ? 'ring-2 ring-primary shadow-lg'
                  : 'hover:border-primary/50'
              )}
              onClick={() => onSelectCompany(company.id)}
            >
              <CardHeader className="text-center pb-2">
                <div
                  className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center p-3"
                  style={{ backgroundColor: `${company.color}20` }}
                >
                  <Image
                    src={company.logo}
                    alt={`${company.name} logo`}
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
                <CardTitle className="text-xl">{company.name}</CardTitle>
                <CardDescription className="text-sm">
                  {company.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-center gap-2 text-xs text-muted-foreground">
                  <span className="bg-secondary px-2 py-1 rounded">
                    {company.problems.length} problems
                  </span>
                  <span className="bg-secondary px-2 py-1 rounded">
                    {company.problems.filter(p => p.frequency === 'High').length} frequent
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
