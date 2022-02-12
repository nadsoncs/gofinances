import React, { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMonths, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VictoryPie } from 'victory-native';
import { RFValue } from 'react-native-responsive-fontsize';

import { useTheme } from 'styled-components'; 
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { HistoryCard } from '../../components/HistoryCard';

import {
  Container,
  LoadContainer,
  Header,
  Title,
  Content,
  ChartContainer,
  MontSelect,
  MontSelectButton,
  MontSelectIcon,
  Month,

} from './styles';
import { categories } from '../../../utils/categories';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../hooks/auth';


interface  TransactionData {
  type: 'positive' | 'negative';
  name: string;
  amount: string;
  category: string;
  date: string;
}
interface CategoryData {
  key: string;
  name: string;
  total: number;
  totalFormatted: string;
  color: string;
  percent: string;
}
export function Resume() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [totalByCategories, setTotalByCategories] = useState<CategoryData[]>([]);
  const { user } = useAuth();
  const theme = useTheme();

  function handlerDateChange(action: 'next' | 'prev') {
    if(action === 'next'){
      setSelectedDate(addMonths(selectedDate, 1));
    } else {
      setSelectedDate(subMonths(selectedDate, 1));
    }
  }
  async function loadData() {
    setIsLoading(true);
    const dataKey = `@gofinances:transactions_user:${user.id}`;
    const response = await AsyncStorage.getItem(dataKey);
    const responseFormatted = response ? JSON.parse(response) : [];

    const expensives = responseFormatted.filter(
      (expensive: TransactionData) => 
        expensive.type === 'negative' &&
        new Date(expensive.date).getMonth() === selectedDate.getMonth() &&
        new Date(expensive.date).getFullYear() === selectedDate.getFullYear()
    );

    const expensivesTotal = expensives.reduce(
      (acumullator: number, expensive: TransactionData) =>{
        return acumullator + Number(expensive.amount);
      }
    , 0);
    const totalByCategory: CategoryData[] = [];

    categories.forEach(category => {
      let categorySum = 0;

      expensives.forEach((expensive: TransactionData) => {
        if(expensive.category === category.key){
          categorySum += Number(expensive.amount);
        }
      })
      
      if(categorySum > 0){
        
        const totalFormatted = categorySum.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        });

        const percent = `${(categorySum / expensivesTotal * 100).toFixed(0)}%`;

        totalByCategory.push({
          key: category.key,
          name: category.name,
          color: category.color,
          total: categorySum,
          totalFormatted,
          percent,
        })
      }
    })

    setTotalByCategories(totalByCategory);
    setIsLoading(false);
  }

  useFocusEffect(useCallback(() => {
    loadData();
  }, [selectedDate]));

  return (
    <Container>
      <Header>
        <Title>Resume</Title>
      </Header>
      {
        isLoading ?
        <LoadContainer>
          <ActivityIndicator 
            color={theme.colors.primary}
            size="large"
          />
        </LoadContainer>
        :
          <Content
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              paddingBottom: useBottomTabBarHeight(),
            }}
          >
            <MontSelect>
              <MontSelectButton onPress={() => handlerDateChange('prev')} >
                <MontSelectIcon name="chevron-left" />
              </MontSelectButton>

              <Month>
                { format(selectedDate, 'MMMM, yyyy', {locale: ptBR})}
              </Month>

              <MontSelectButton onPress={() => handlerDateChange('next')} >
                <MontSelectIcon name="chevron-right" />
              </MontSelectButton>
            </MontSelect>

            <ChartContainer>
              <VictoryPie
                data={totalByCategories}
                x="percent"
                y="total"
                labelRadius={50}
                colorScale={totalByCategories.map(category => category.color)}
                style={{
                  labels: {
                    fontSize: RFValue(18),
                    fontWeight: 'bold',
                    fill: theme.colors.shape
                  }
                }}
              />
            </ChartContainer>
            { 
              totalByCategories.map(item =>(
                <HistoryCard
                  key={item.key}
                  title={item.name}
                  amount={item.totalFormatted}
                  color={item.color}
                />
              ))
            }
          </Content>
        }
    </Container>
  );
}